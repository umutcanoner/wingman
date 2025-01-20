import { WebviewView } from "vscode";
import { MODE_PROGRAMMING_ID, Mode } from "../../../shared";
import { PreparedCommand } from "../dispatcher";
import { OpenAITokenizer } from "../tokenizers/openai";
import { LiteLLMProvider } from "./litellm";

interface Format {
  system: string;
  user: string;
  first: string;
  stops: string[];
}

export const formats: { [key: string]: Format } = {
  OpenAI: {
    system: "{system_message}",
    user: "{user_message}",
    first: "{system}",
    stops: [],
  },
  Anthropic: {
    system: "{system_message}",
    user: "\n\nHuman: {user_message}\n\nAssistant:",
    first: "{system}{user}",
    stops: ["Human:"],
  },
  Alpaca: {
    system: "{system_message}",
    user: "### Instruction: {user_message}\n\n### Response:",
    first: "{system}\n\n{user}",
    stops: ["### Instruction:"],
  },
  Vicuna: {
    system: "{system_message}",
    user: "USER:\n{user_message}\nASSISTANT:",
    first: "{system}\n\n{user}",
    stops: ["USER:"],
  },
  ChatML: {
    system: "<|im_start|>system\n{system_message}<|im_end|>",
    user: "<|im_start|>user\n{user_message}<|im_end|>\n<|im_start|>assistant\n",
    first: "{system}\n{user}",
    stops: ["<|im_end|>"],
  },
  "Llama 2": {
    system: "<<SYS>>\n{system_message}\n<</SYS>>",
    user: "<s>[INST] {user_message} [/INST]",
    first: "<s>[INST] {system}\n\n{user_message} [/INST]",
    stops: ["</s>"],
  },
  "Orca 2": {
    system: "### System:\n{system_message}",
    user: "### User:\n{user_message}\n\n### Response:\n",
    first: "{system}\n\n{user}",
    stops: ["### User:"],
  },
};

export const applyFormat = (format: keyof typeof formats, command: PreparedCommand) => {
  const formatDefinition = formats[format];

  const system = formatDefinition.system.replace("{system_message}", command.system);
  const user = formatDefinition.user.replace("{user_message}", command.message);
  const first = formatDefinition.first.replace("{system}", system).replace("{user}", user);

  return {
    system,
    first,
    user,
  };
};

interface CompletionParam {
  name: string;
  default: string | number | string[];
}

export const providers = {
  LiteLLM: {
    instance: LiteLLMProvider,
    completionParams: [
      { key: "model", value: "gpt-3.5-turbo" },
      { key: "temperature", value: "0.3" },
      { key: "max_tokens", value: "4096" },
      { key: "top_p", value: "1" },
      { key: "frequency_penalty", value: "0" },
      { key: "presence_penalty", value: "0" },
      { key: "stop", value: "" }
    ] as const,
  }
};

export const tokenizers = {
  OpenAI: {
    instance: OpenAITokenizer,
  },
  Llama: {
    instance: OpenAITokenizer,
  },
  Anthropic: {
    instance: OpenAITokenizer,
  },
};

// Helper type to extract completion parameters for a provider
type ProviderCompletionParams<T extends keyof typeof providers> = {
  [key: string]: string;
};

export const getProviderCompletionParamDefaults = <T extends keyof typeof providers>(
  provider: T
): ProviderCompletionParams<T> => {
  const params: { [key: string]: string } = {};
  providers[provider].completionParams.forEach((param) => {
    params[param.key] = param.value;
  });
  return params;
};

export const DEFAULT_MODE: Mode = {
  label: "Programming",
  id: MODE_PROGRAMMING_ID,
};

export interface APIProvider {
  webviewView: WebviewView;
  command: PreparedCommand;
  onProgressCallback?: (text: string) => void;
  send(message?: string): Promise<string>;
  abort(): void;
}

export const EXTENSION_SCHEME = "wingman_fork";
