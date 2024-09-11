import OpenAI from "openai";
import * as fs from "fs";
const openai = new OpenAI();

async function ask(
  body: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
) {
  return await openai.chat.completions.create(body);
}

async function searchFile(
  assistantBody: OpenAI.Beta.Assistants.AssistantCreateParams,
  files: string[],
  vectorStoreBody: OpenAI.Beta.VectorStores.VectorStoreCreateParams,
  fileAttachBodyArray: any[],
  userQuestion: string,
) {
  const assistant = await openai.beta.assistants.create({
    ...assistantBody,
    temperature: 0,
  });
  console.log("Loading the following files to OpenAI: ", files);
  const fileStreams = files.map((path) => fs.createReadStream(path));

  // Create a vector store including our two files.
  if (vectorStoreBody) {
    const vectorStore = await openai.beta.vectorStores.create(vectorStoreBody);

    if (fileStreams.length > 0) {
      await openai.beta.vectorStores.fileBatches
        // @ts-expect-error
        .uploadAndPoll(vectorStore.id, fileStreams)
        .catch(async (e) => {
          console.warn("Error uploading and polling: ", e.message);
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
  const attachments: { file_id: any; tools: { type: string }[] }[] = [];
  userFileAttachments.forEach((attachment) => {
    attachments.push({
      file_id: attachment.id,
      tools: [{ type: "file_search" }],
    });
  });

  // @ts-expect-error ???
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

  return await new Promise((resolve, reject) => {
    console.log(`Running the beta threads of OpenAI: ${thread.id}`, {
      userQuestion, attachments
    });
    try {
      openai.beta.threads.runs
        .stream(thread.id, {
          assistant_id: assistant.id,
        })
        .on("textCreated", () => console.log("assistant >"))
        .on("toolCallCreated", (event) =>
          console.log("assistant " + event.type),
        )
        .on("messageDone", async (event) => {
          console.log("Running the beta threads of OpenAI...done.");
          if (event.content[0].type === "text") {
            const { text } = event.content[0];
            const { annotations } = text;
            const citations: string[] = [];

            let index = 0;
            for (const annotation of annotations) {
              text.value = text.value.replace(
                annotation.text,
                "[" + index + "]",
              );
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
    } catch (e) {
      console.log("Error while running the beta threads of OpenAI", e);
      reject(e);
    }
  });
}

export { ask, searchFile };
