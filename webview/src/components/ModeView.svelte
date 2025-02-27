<script lang="ts" context="module">
  export type ChatMessage = {
    from: "user" | "assistant";
    message: string;
  };

  export type Conversation = {
    id: string;
    archived: Date;
    messages: ChatMessage[];
  };
</script>

<script lang="ts">
  import extComm from "@/messaging";
  import { activeMode, activePreset, presets } from "@/store";
  import type { Category } from "@/types";
  import { onMount, tick } from "svelte";
  import { ChatEvents } from "../../../shared";
  import Button from "./Button.svelte";
  import ChatHistoryList from "./ChatHistoryList.svelte";
  import CommandCategory from "./CommandCategory.svelte";
  import ConversationMessage from "./ConversationMessage.svelte";
  import Sidebar from "./Sidebar.svelte";
  import ExtensionSettings from "./ExtensionSettings.svelte";
  import GrowingTextarea from "./GrowingTextarea.svelte";
  import { slide } from "svelte/transition";

  export let showExtensionSettings = false;
  export let categories: Category[] = [];
  let description = "";
  let disableSidebar = false;
  let input;
  
  function showDescription(event) {
    const title = event.target.textContent;
    for (const category of categories) {
      const matchingItem = category.items.find(item => item.title === title);
      if (matchingItem) {
        description = `${matchingItem.description}\n\nPROMPT\n======\n\n${matchingItem.message}`;
        return;
      }
    }
  }

  function hideDescription() {
    description = "";
  }
  
  function runCommand(item) {
    if (disableSidebar) return;
  
    closeConversation();
    extComm.RUN(item.promptId);
  }
  
  let conversationContainer;
  let ignoreScrollEvents = false;
  let conversationHistory: Conversation[] = [];
  let chats: ChatMessage[] = [];
  let responseInProgress = false;
  let scrolledWhileResponseInProgress = false;
  
  const scrollToBottom = () => {
    if (ignoreScrollEvents) return;
  
    ignoreScrollEvents = true;
    conversationContainer.scrollTop = conversationContainer.scrollHeight;
    setTimeout(() => (ignoreScrollEvents = false), 50);
  };
  
  $: canCloseConversation = chats.length && !responseInProgress;
  $: preventScrolling = responseInProgress && scrolledWhileResponseInProgress;
  
  function onConversationContainerScrolled() {
    if (ignoreScrollEvents || !responseInProgress) return;
  
    const isNearBottom =
      conversationContainer.scrollTop + conversationContainer.clientHeight >=
      conversationContainer.scrollHeight - 10;
    scrolledWhileResponseInProgress = !isNearBottom;
  }
  
  async function updateChatsAndScroll(message, from) {
    if (from === "assistant" && chats.length && chats[chats.length - 1].from === "assistant") {
      chats = [...chats.slice(0, -1), {...chats[chats.length - 1], message: String(message.value)}];
    } else {
      chats = [...chats, { from, message: message.value }];
    }
  
    await tick();
    if (!preventScrolling) scrollToBottom();
  }
  
  const listenChatInitiated = extComm.on(ChatEvents.ChatInitiated, async () => {
    disableSidebar = true;
    chats = [];
    responseInProgress = true;
    await tick();
    scrollToBottom();
  });
  
  const listenChatEnded = extComm.on(ChatEvents.ChatEnded, async () => {
    disableSidebar = false;
    responseInProgress = false;
    await tick();
    input.focus();
    scrollToBottom();
    scrolledWhileResponseInProgress = false;
  });
  
  const listenChatMessageReceived = extComm.on(ChatEvents.ChatMessageReceived, message => {
    updateChatsAndScroll(message, "assistant");
  });
  
  const listenChatMessageSent = extComm.on(ChatEvents.ChatMessageSent, async (message) => {
    updateChatsAndScroll(message, "user");
    responseInProgress = true;
    disableSidebar = true;
    await tick();
    scrollToBottom();
  });
  
  const listenAbort = extComm.on("aborted", () => {
    responseInProgress = false;
    disableSidebar = false;
    input.focus();
  });
  
  function getHistory() {
    extComm.GET("chatHistory").then(history => {
      conversationHistory = history.map(conversation => ({
        ...conversation,
        archived: new Date(conversation.archived)
      }));
    });
  }
  
  activeMode.subscribe(getHistory);

  const listenShown = extComm.on("shown", () => {
    tick().then(() => input?.focus());
  });

  const listenHidden = extComm.on("hidden", () => {
    input?.blur();
  });
  
  onMount(() => {
    tick().then(() => input?.focus());
    getHistory();

    extComm.GET("disablePromptInsertion").then((value) => {
      disablePromptInsertion = value;
      console.log("disablePromptInsertion", value);
    });
  
    return () => {
      listenChatInitiated();
      listenChatEnded();
      listenChatMessageReceived();
      listenChatMessageSent();
      listenAbort();
      listenShown();
      listenHidden();
    };
  });

  export const closeConversation = () => {
    if (!chats.length) return;

    const keep = 30;

    const newConversation: Conversation = {
      id: String(Date.now()),
      archived: new Date(),
      messages: chats,
    };

    conversationHistory = [newConversation, ...conversationHistory];

    if (conversationHistory.length > keep) {
      conversationHistory = conversationHistory.slice(0, keep);
    }

    extComm.UPDATE("chatHistory", conversationHistory);

    chats = [];
  };

  const cancel = () => {
    extComm.ABORT();
  };

  const onChatSubmit = (e) => {
    const input = e.detail;
    if (input.trim() === "") { return; }
    if (responseInProgress) return;
    extComm.SEND(input);
    _setInputValue("");
  };

  const onNewChatSubmit = (e) => {
    const input = e.detail;
    if (input.trim() === "") { return; }
    if (responseInProgress) return;
    extComm.SEND_UNPROMPTED(input);
    _setInputValue("");
  };

  let setInputValue;

  function _setInputValue (v) {
    setInputValue?.(v);
  }

  let viewingArchivedConversation = false;

  const onToggleHistoryMessage = (e: CustomEventInit<Boolean>) => {
    if (e.detail) {
      viewingArchivedConversation = true;
    } else {
      viewingArchivedConversation = false;
    }
  };

  let disablePromptInsertion = false;

  const onToggleDisablePromptInsertion = (e) => {
    const checked = e.target.checked;
    extComm.SET("disablePromptInsertion", checked);
  };

  function handlePresetChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    const selectedPreset = $presets.find(p => p.id === select.value);
    if (selectedPreset) {
      activePreset.set(selectedPreset);
      extComm.UPDATE("activePreset", selectedPreset);
    }
  }
</script>

<div class="flex-1 flex flex-col overflow-y-auto">
  {#if showExtensionSettings}
    <div class="flex-0 border-b border-panel" transition:slide={{ duration: 150 }}>
      <ExtensionSettings on:getPrompts />
    </div>
  {/if}
  <div class="flex flex-1 overflow-hidden">
    <Sidebar>
      {#each categories as category}
        <CommandCategory category={category.category} disabled={disableSidebar}>
          {#each category.items as item}
            <button
              on:click={() => runCommand(item)}
              class="items-center"
              on:mouseenter={showDescription}
              on:mouseleave={hideDescription}
            >
              {item.title}
            </button>
          {/each}
        </CommandCategory>
      {/each}
    </Sidebar>
    <div
      class="flex-1 flex flex-col justify-between opacity-100 overflow-hidden relative h-full p-2 items-center"
    >
      {#if description}
        <div class="absolute z-10 top-2 right-2 left-2 p-2 bg-black text-gray-300">
          <pre class="whitespace-pre-wrap">{description}</pre>
        </div>
      {/if}

      {#if chats.length === 0 && conversationHistory.length > 0}
        <div class="flex flex-col overflow-auto px-5 items-center w-full">
          <ChatHistoryList chatHistory={conversationHistory} on:toggleHistoryMessage={onToggleHistoryMessage} />
        </div>
      {/if}

      <div
        class="flex flex-col overflow-auto px-5 items-center w-full"
        on:scroll={onConversationContainerScrolled}
        bind:this={conversationContainer}
      >
        {#each chats as chat, index}
          <ConversationMessage
            from={chat.from}
            message={chat.message}
            responseInProgress={responseInProgress && chat.from === "assistant"}
            isLastMessage={index === chats.length - 1}
            on:scrollToBottom={scrollToBottom}
          />
        {/each}
      </div>

      <div class="flex-0 px-5 flex flex-col justify-center items-center w-full">
        <div class="w-full">
          {#if chats.length !== 0}
            <GrowingTextarea
              bind:this={input}
              bind:setValue={setInputValue}
              class="w-full border border-panel p-2"
              placeholder="Say something..."
              on:submit={onChatSubmit}
            />
            {:else}
              {#if !viewingArchivedConversation}
                <GrowingTextarea
                  bind:this={input}
                  bind:setValue={setInputValue}
                  class="w-full border border-panel p-2"
                  placeholder="Say something..."
                  on:submit={onNewChatSubmit}
                />
              {/if}
          {/if}
        </div>
        <status-bar class="w-full pt-2 flex justify-between h-8">
          <div class="flex items-center">
            {#if responseInProgress}
              <Button variant="danger" size="md" class="mr-2" on:click={cancel}
                >Cancel</Button
              >
            {/if}

            {#if canCloseConversation}
              <Button variant="secondary" size="md" class="mr-2" on:click={closeConversation}
                >Close conversation</Button
              >
            {/if}
          </div>
          <div class="flex-1 flex justify-between items-center text-xs">
            <div class="">
              <div class="flex flex-col items-start">
                <span class="opacity-50">Global overrides</span>
                <span class="flex items-center">
                  <input type="checkbox" id="disablePromptInsertion" on:change={onToggleDisablePromptInsertion} bind:checked={disablePromptInsertion}/>
                  <label class="opacity-50 ml-1" for="disablePromptInsertion">Disable prompt insertion method</label>
                </span>
              </div>
            </div>

            <div class="ml-8">
              <div class="flex flex-col items-end">
                <span class="opacity-50">Active preset</span>
                <select 
                  class="bg-panel border border-panel rounded px-2 py-1 text-sm"
                  value={$activePreset?.id}
                  on:change={handlePresetChange}
                >
                  {#each $presets as preset}
                    <option value={preset.id}>{preset.name}</option>
                  {/each}
                </select>
              </div>
            </div>
          </div>
        </status-bar>
      </div>
    </div>
  </div>
</div>
