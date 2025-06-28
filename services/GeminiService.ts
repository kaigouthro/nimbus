import { GoogleGenAI, GenerateContentResponse, Content } from "@google/genai";

// API key is expected to be set as an environment variable `API_KEY`
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("Gemini API key not found. Please ensure API_KEY is set as an environment variable.");
}

// Initialize GoogleGenAI only if API_KEY is available.
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

const MODEL_NAME = 'gemini-2.5-flash-preview-04-17';

const defaultSystemInstruction = `You are NimbusEasyStack AI, a helpful and knowledgeable assistant for OpenStack cloud management.
Your primary goal is to assist users with understanding OpenStack concepts, guiding them through resource management tasks, and providing concise, accurate information.
When asked to perform an action (e.g., "launch an instance"), explain the steps or parameters involved in NimbusEasyStack, but clearly state that you cannot perform the action directly. Instead, guide the user on how to do it in the UI.
If a user asks a general OpenStack question, provide a clear explanation.
If a user asks for troubleshooting help, ask for symptoms and provide common troubleshooting steps or explanations for error messages.
Keep your responses friendly, professional, and easy to understand for users who may not be OpenStack experts.
Do not invent API calls or CLI commands unless specifically asked to provide an example of how one might look. Focus on guiding within the NimbusEasyStack UI.
If you are unsure about a specific, highly technical detail, it's better to say you don't have that information than to guess.
When discussing resource creation, you can suggest parameters based on common use cases if the user provides context.
Example: If user says "I need to launch a small web server", you could respond: "To launch a small web server, you'd typically use the 'Launch Instance' feature. You might select an Ubuntu image, a flavor like 'm1.small' (e.g., 1 vCPU, 2GB RAM), attach it to your private network, and assign a security group that allows HTTP/HTTPS traffic. What details are you looking for specifically?"
`;

export const sendMessageToGemini = async (
  message: string,
  history?: Content[],
  systemInstruction?: string
): Promise<string> => {
  if (!ai) { // Check if 'ai' instance was initialized
    return "Error: Gemini AI service is not configured. The API key (API_KEY) may be missing or was not set in the environment.";
  }
  try {
    const chat = ai.chats.create({
        model: MODEL_NAME,
        config: {
            systemInstruction: systemInstruction || defaultSystemInstruction,
        },
        history: history || [],
    });

    const result: GenerateContentResponse = await chat.sendMessage({message: message});
    return result.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        if (error.message.includes('API key not valid')) {
             return "Error: The Gemini API key is invalid. Please check your API_KEY environment variable.";
        }
        // Check for specific Gemini API error structures if available
        if ((error as any).message?.toLowerCase().includes("api key not valid")) {
          return "Error: The Gemini API key is invalid or not authorized. Please check your API_KEY environment variable.";
        }
        if ((error as any).message?.toLowerCase().includes("quota")) {
          return "Error: AI assistant API quota exceeded. Please try again later or check your Gemini project billing.";
        }
         return `Error communicating with AI assistant: ${error.message}. Please try again later.`;
    }
    return "An unknown error occurred while contacting the AI assistant.";
  }
};

// Example of how to structure history for the `chats.create` or `sendMessage`
export const convertChatHistoryToGeminiHistory = (chatMessages: { sender: 'user' | 'ai'; text: string }[]): Content[] => {
    return chatMessages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model', // Gemini uses 'user' and 'model'
        parts: [{ text: msg.text }],
    }));
};