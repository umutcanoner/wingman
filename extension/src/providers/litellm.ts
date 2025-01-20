import { WebviewView } from "vscode";
import { PreparedCommand } from "../dispatcher";
import { APIProvider, applyFormat } from "./common";
import litellm from "litellm";

export class LiteLLMProvider implements APIProvider {
  webviewView: WebviewView;
  command: PreparedCommand;
  onProgressCallback?: (text: string) => void;
  abortController: AbortController;
  messages: any[] = [];

  constructor(viewProvider: WebviewView, command: PreparedCommand, onProgressCallback?: (text: string) => void) {
    this.webviewView = viewProvider;
    this.command = command;
    this.abortController = new AbortController();
    this.onProgressCallback = onProgressCallback;
  }

  private getProviderFormat() {
    // Map model to provider format
    const model = (this.command.completionParams as any).model as string;
    if (model.startsWith('gpt-')) return 'OpenAI';
    if (model.startsWith('claude-')) return 'Anthropic';
    return 'OpenAI'; // default to OpenAI format
  }

  async send(message?: string): Promise<string> {
    const providerFormat = this.getProviderFormat();
    
    if (this.messages.length === 0) {
      const { system } = applyFormat(providerFormat, this.command);
      this.messages.push({ role: "system", content: system });
    }

    if (message === undefined) {
      this.messages.push({ role: "user", content: this.command.message });
    } else {
      this.messages.push({ role: "user", content: message });
    }

    try {
      let fullResponse = '';
      // Ensure required parameters are present
      const params = {
        model: (this.command.completionParams as any).model || 'gpt-3.5-turbo',
        messages: this.messages,
        temperature: (this.command.completionParams as any).temperature || 0.3,
        max_tokens: (this.command.completionParams as any).max_tokens || 4096,
        stream: true
      };

      const stream = await litellm.completion(params);

      for await (const chunk of stream as AsyncIterable<any>) {
        const content = chunk.choices[0]?.delta?.content || '';
        fullResponse += content;
        this.onProgressCallback?.(content);
      }
      this.messages.push({ role: "assistant", content: fullResponse });
      return fullResponse;

    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'An error occurred during completion';
      throw new Error(errorMessage);
    }
  }

  abort(): void {
    if (!this.abortController) return;
    
    try {
      this.abortController.abort();
      this.abortController = new AbortController();
    } catch (error) {
      console.error('Error aborting request:', error);
    }
  }
}
