import OpenAI from "openai";
import * as fs from "fs";

const openai = new OpenAI();

async function ask(body) {
  return await openai.chat.completions.create(body);
}

async function searchFile(
  assistantBody,
  files: string[],
  vectorStoreBody,
  fileAttachBodyArray,
  userQuestion: string,
) {
  const assistant = await openai.beta.assistants.create({
    ...assistantBody,
    temperature: 0,
  });
  const fileStreams = files.map((path) => fs.createReadStream(path));

  // Create a vector store including our two files.
  if (vectorStoreBody) {
    const vectorStore = await openai.beta.vectorStores.create(vectorStoreBody);

    if (fileStreams.length > 0) {
      // @ts-expect-error I don't know why TS complains here. https://platform.openai.com/docs/assistants/quickstart
      await openai.beta.vectorStores.fileBatches
        .uploadAndPoll(vectorStore.id, fileStreams)
        .catch(async (e) => {
          console.warn("Error uploading and polling", e.message);
        });
    }
    await openai.beta.assistants.update(assistant.id, {
      tool_resources: { file_search: { vector_store_ids: [vectorStore.id] } },
    });
  }

  // A user wants to attach a file to a specific message, let's upload it.

  const userFileAttachments = await Promise.all(
    fileAttachBodyArray.map((fileAttachBody) => {
      return openai.files.create(fileAttachBody);
    }),
  );
  const attachments = [];
  userFileAttachments.forEach((attachment) => {
    attachments.push({
      file_id: attachment.id,
      tools: [{ type: "file_search" }],
    });
  });

  const thread = await openai.beta.threads.create({
    messages: [
      {
        role: "user",
        content: userQuestion,
        // Attach the new file to the message.
        attachments: attachments,
      },
    ],
  });

  // The thread now has a vector store in its tool resources.
  console.log("Vector stores are ready", thread.tool_resources?.file_search);

  return await new Promise((resolve) => {
    openai.beta.threads.runs
      .stream(thread.id, {
        assistant_id: assistant.id,
      })
      .on("textCreated", () => console.log("assistant >"))
      .on("toolCallCreated", (event) => console.log("assistant " + event.type))
      .on("messageDone", async (event) => {
        if (event.content[0].type === "text") {
          const { text } = event.content[0];
          const { annotations } = text;
          const citations: string[] = [];

          let index = 0;
          for (const annotation of annotations) {
            text.value = text.value.replace(annotation.text, "[" + index + "]");
            // @ts-expect-error I don't know why TS complains here. https://platform.openai.com/docs/assistants/quickstart
            const { file_citation } = annotation;
            if (file_citation) {
              const citedFile = await openai.files.retrieve(
                file_citation.file_id,
              );
              citations.push("[" + index + "]" + citedFile.filename);
            }
            index++;
          }
          resolve({
            text,
            citations,
          });
        }
      });
  });
}

export { ask, searchFile };
