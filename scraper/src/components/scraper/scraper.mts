import * as puppeteer from "puppeteer";
import * as fsPromises from "fs/promises";
import * as fs from "fs";
import * as path from "path";
import axios from "axios";
import pLimit from "p-limit";

async function downloadPDF(outputPath, url) {
  try {
    // Fetch the binary data (PDF) from the URL
    const response = await axios.get(url, { responseType: "stream" }); // Get as a stream

    // Ensure directory exists using fs.mkdirSync with recursive option
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    // Create a write stream to the file
    const writer = fs.createWriteStream(outputPath);

    // Pipe the response data into the file stream
    response.data.pipe(writer);

    // Return a Promise that resolves when the writing is done
    return new Promise((resolve, reject) => {
      writer.on("finish", resolve); // Resolve when the writing is complete
      writer.on("error", reject); // Reject if there's an error
    });
  } catch (error) {
    console.error("Error downloading the PDF:", error);
    throw error;
  }
}

async function scrapePDF(operatorId: number, year) {
  let browser: puppeteer.Browser | null = null;
  // Define the path to save the PDF
  const pdfDownloadURLFilePath = path.resolve(
    `${__dirname}/../../../../database/pdf-links`,
    `operator_${operatorId}_Tarifblatt_2024_link.txt`,
  );
  const pdfFilePath = path.resolve(
    `${__dirname}/../../../../database/pdf`,
    `operator_${operatorId}_Tarifblatt_2024.pdf`,
  );

  let page: puppeteer.Page;
  let pdfDownloadURL: string;
  try {
    // Launch Puppeteer browser instance
    browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: false,
      executablePath: "/usr/bin/google-chrome",
    });

    page = await browser.newPage();

    // Navigate to the page
    const url = `https://www.strompreis.elcom.admin.ch/operator/${operatorId}`;
    await page.goto(url, { waitUntil: "networkidle2" });

    // Wait for the page to load and ensure the button exists
    await page.waitForFunction(
        (year) => {
          const anchorElements = Array.from(document.querySelectorAll('a'));
          return anchorElements.some(el => el.innerText === `Tarifblatt ${year} (PDF-Datei)`);
        },
        { timeout: 10000 },  // Optional timeout
        year  // Argument to pass to the function inside the browser context
    );
    pdfDownloadURL = await page.evaluate((year) => {
      return Array.from(document.querySelectorAll("a")).filter(
        (el) => el.innerText === `Tarifblatt ${year} (PDF-Datei)`,
      )[0].href;
    }, year);

    if (!pdfDownloadURL) {
      throw new Error(
        "PDF link with text 'Tarifblatt 2024 (PDF-Datei)' not found",
      );
    }
    // Ensure directory exists using fs.mkdirSync with recursive option
    fs.mkdirSync(path.dirname(pdfDownloadURLFilePath), { recursive: true });
    await fsPromises.writeFile(pdfDownloadURLFilePath, pdfDownloadURL);

    console.log(`PDF URL saved successfully to ${pdfDownloadURLFilePath}`, {
      pdfDownloadURL,
    });

    // Also save the PDF file to the disk
    await downloadPDF(pdfFilePath, pdfDownloadURL);

    console.log(`PDF file saved successfully to ${pdfFilePath}`);
  } catch (error) {
    console.error(`Error occurred`, error);
  } finally {
    if (page) {
      await page.close(); // Ensure page is closed even on error
    }
    if (browser) {
      await browser.close(); // Ensure browser is closed even on error
    }
  }
  return {
    pdfDownloadURLFilePath,
    pdfDownloadURL,
    pdfFilePath,
  };
}

async function scrapePDFBatch(operatorIdArray, year, maxConcurrent = 1) {
  const limit = pLimit(maxConcurrent);
  const limitInput = operatorIdArray.map((operatorId) => {
    return limit(() => scrapePDF(operatorId, year));
  });
  return Promise.all(limitInput);
}

export { scrapePDF, scrapePDFBatch };
