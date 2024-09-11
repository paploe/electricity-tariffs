const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Helper function to get the command line arguments
function getArgValue(argName) {
    const index = process.argv.indexOf(argName);
    if (index > -1 && process.argv[index + 1]) {
        return process.argv[index + 1];
    }
    return null;
}

// Get the arguments
const elcomNumbersPath = getArgValue('--elcom-numbers');
const fromIndex = parseInt(getArgValue('--from'), 10);
const toIndex = parseInt(getArgValue('--to'), 10);

// Check if required arguments are provided
if (!elcomNumbersPath || isNaN(fromIndex) || isNaN(toIndex)) {
    console.error('Missing required arguments. Usage: node process.js --elcom-numbers <path> --from <number> --to <number>');
    process.exit(1);
}

// Resolve the path to the JSON file
const fullPath = path.resolve(elcomNumbersPath);

// Read and parse the JSON file
let numbersArray;
try {
    const fileContent = fs.readFileSync(fullPath, 'utf8');
    numbersArray = JSON.parse(fileContent).elcomNumbers.sort();
} catch (err) {
    console.error(`Error reading or parsing the file: ${err.message}`);
    process.exit(1);
}

// Validate the numbers array
if (!Array.isArray(numbersArray)) {
    console.error('The JSON file does not contain an array.');
    process.exit(1);
}

// Check if the range is valid
if (fromIndex < 0 || toIndex >= numbersArray.length || fromIndex > toIndex) {
    console.error('Invalid range specified.');
    process.exit(1);
}

// Function to spawn a child process to run Docker command
function runCommand(number) {

    const command = `bash`;
    const myArgs = [
        'process-single.sh',
        number
    ];

    // Spawn the Docker process
    const child = spawn(command, myArgs);

    child.stdout.on('data', (data) => {
        console.log(`Docker Output [${number}]: ${data}`);
    });

    child.stderr.on('data', (data) => {
        console.error(`Docker Error [${number}]: ${data}`);
    });

    child.on('close', (code) => {
        console.log(`Docker process for ${number} exited with code ${code}`);
    });
}

// Run Docker commands for each number in the specified range
for (let i = 0; i < numbersArray.length; i++) {
    let elcomNumber = numbersArray[i];
    if(elcomNumber >= numbersArray && elcomNumber <= toIndex) {
        runCommand(numbersArray[elcomNumber]);
    }
}
