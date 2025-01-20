import * as vscode from "vscode";
import { Preset, defaultModes, generateId, systems } from "../../shared";
import { getProviderCompletionParamDefaults, providers } from "./providers/common";
import { State } from "./state";
import { createPromptMap, getModes, stateKeys } from "./utils";
import { MainViewProvider } from "./views/main";

export const createDefaultPresetsForAllModes = () => {
  const modes = getModes();

  modes.forEach((mode) => {
    State.set(`${mode.id}-presets`, undefined);
    State.set(`${mode.id}-activePreset`, undefined);
  });

  const presets = getModes().map((mode) => State.get(`${mode.id}-presets`)).filter(Boolean);

  if (!presets || !presets.length) {
    const modes = getModes();

    modes.forEach((mode) => {
      State.set(`${mode.id}-presets`, [
        {
          id: generateId(),
          name: "GPT-3.5 Turbo",
          provider: "LiteLLM",
          format: "OpenAI",
          tokenizer: "OpenAI",
          url: "https://api.openai.com/v1/chat/completions",
          system: systems.get(mode.id),
          completionParams: Object.entries(getProviderCompletionParamDefaults("LiteLLM")).map(([key, value]) => ({
            key,
            value
          })),
        },
        {
          id: generateId(),
          name: "GPT-4 Turbo",
          provider: "LiteLLM",
          format: "OpenAI",
          tokenizer: "OpenAI",
          url: "https://api.openai.com/v1/chat/completions",
          system: systems.get(mode.id),
          completionParams: Object.entries({
            ...getProviderCompletionParamDefaults("LiteLLM"),
            model: "gpt-4-1106-preview"
          }).map(([key, value]) => ({
            key,
            value: String(value)
          })),
        },
        {
          id: generateId(),
          name: "Claude Instant",
          provider: "LiteLLM",
          format: "Anthropic",
          tokenizer: "OpenAI",
          url: "https://api.anthropic.com/v1/complete",
          system: systems.get(mode.id),
          completionParams: Object.entries({
            ...getProviderCompletionParamDefaults("LiteLLM"),
            model: "claude-instant-1"
          }).map(([key, value]) => ({
            key,
            value: String(value)
          })),
        },
        {
          id: generateId(),
          name: "Claude 2.1",
          provider: "LiteLLM",
          format: "Anthropic",
          tokenizer: "OpenAI",
          url: "https://api.anthropic.com/v1/complete",
          system: systems.get(mode.id),
          completionParams: Object.entries({
            ...getProviderCompletionParamDefaults("LiteLLM"),
            model: "claude-2.1"
          }).map(([key, value]) => ({
            key,
            value: String(value)
          })),
        },
        {
          id: generateId(),
          name: "Local LM Studio",
          provider: "LiteLLM",
          format: "OpenAI",
          tokenizer: "OpenAI",
          url: "http://localhost:1234/v1/chat/completions",
          system: systems.get(mode.id),
          completionParams: Object.entries({
            ...getProviderCompletionParamDefaults("LiteLLM"),
            model: "local-model"
          }).map(([key, value]) => ({
            key,
            value: String(value)
          })),
        }
      ] as Preset[]);
      const presets = State.get(`${mode.id}-presets`) as Preset[];
      State.set(`${mode.id}-activePreset`, presets[0]);
    });
  }

  State.set(stateKeys.activeMode(), modes[0]);
};

const setShowWelcomeWizard = () => {
  State.set(stateKeys.welcomeWizard(), true);
};

export const createState = () => {
  State.clear();

  State.set(stateKeys.modes(), [...defaultModes]);

  createDefaultPresetsForAllModes();

  createPromptMap();

  {
    const id = generateId();
    State.set(stateKeys.placeholders(), {
      [id]: {
        id,
        key: "important",
        value: "IMPORTANT: Only return the code inside of a Markdown code block nothing else, like this:\n\n```{{ft}}\n[CODE HERE]\n```\n\nDo not explain your changes."
      },
    });
  }

  State.set(stateKeys.stateCreated(), true);
};

export const promptSetProviderKey = async (provider: keyof typeof providers) => {
  if (!providers[provider]) { return; }
  const key = await vscode.window.showInputBox({ prompt: `Enter your ${provider} API key.` });
  if (key === undefined) return;
  await State.setSecret(stateKeys.providerApiKey(provider), key);
};

export function activate(context: vscode.ExtensionContext) {
  State.create(context);

  const stateCreated = State.get(stateKeys.stateCreated());

  if (!stateCreated) {
    createState();
  }

  // const showWizard = State.get(stateKeys.welcomeWizard());

  // if (showWizard === undefined) {
    // setShowWelcomeWizard();
  // }

  try {
    const setApiKeyCommand = vscode.commands.registerCommand("wingman.fork.setApiKey", async () => {
      const selectedProvider = await vscode.window.showQuickPick(
        Object.keys(providers).map((key) => ({ label: key })),
        { placeHolder: "Select the provider you want to set the API key for." },
      );
  
      if (!selectedProvider) return;
  
      const apiKey = await vscode.window.showInputBox({ prompt: `Enter your ${selectedProvider.label} API key.` });
  
      if (!apiKey) return;
  
      await State.setSecret(stateKeys.providerApiKey(selectedProvider.label), apiKey);
    });
  
    context.subscriptions.push(setApiKeyCommand);
  } catch (error) {
    console.error(error);
  }

  const view = new MainViewProvider(
    context.extensionPath,
    context.extensionUri
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      MainViewProvider.viewType,
      view,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      }
    )
  );
}

export function deactivate() {}
