<script lang="ts">
  import extComm from "@/messaging";
  import { createEventDispatcher, onMount } from "svelte";
  import Button from "./Button.svelte";
  import ConfirmationDialog from "./ConfirmationDialog.svelte";
  import ModeSettings from "./ModeSettings.svelte";
  import PresetSettings from "./PresetSettings.svelte";
  import PromptSettings from "./PromptSettings.svelte";
  import PlaceholderSettings from "./PlaceholderSettings.svelte";

  const dispatch = createEventDispatcher();

  const getPrompts = () => {
    dispatch("getPrompts");
  };

  let providers: string[] = [];
  let activeTab = "general"; // general, modes, presets, prompts, placeholders

  onMount(() => {
    extComm.GET("providers").then((data) => {
      providers = data;
    });
  });

  const setProviderKey = (provider: string) => {
    extComm.SET("apiKey", provider);
  };

  const restore = () => {
    extComm.RESTORE_DEFAULTS().then(() => {
      getPrompts();
    });

    showConfirmRestore = false;
  }

  let showConfirmRestore = false;

  const onConfirmRestore = () => {
    restore();
  };
</script>

<div class="flex-1 bg-panel space-y-6 p-4">
  <div class="flex border-b border-panel mb-4">
    <button 
      class="px-4 py-2 {activeTab === 'general' ? 'mode-icon active' : 'mode-icon'}"
      on:click={() => activeTab = 'general'}
    >
      General
    </button>
    <button 
      class="px-4 py-2 {activeTab === 'modes' ? 'mode-icon active' : 'mode-icon'}"
      on:click={() => activeTab = 'modes'}
    >
      Modes
    </button>
    <button 
      class="px-4 py-2 {activeTab === 'presets' ? 'mode-icon active' : 'mode-icon'}"
      on:click={() => activeTab = 'presets'}
    >
      Presets
    </button>
    <button 
      class="px-4 py-2 {activeTab === 'prompts' ? 'mode-icon active' : 'mode-icon'}"
      on:click={() => activeTab = 'prompts'}
    >
      Prompts
    </button>
    <button 
      class="px-4 py-2 {activeTab === 'placeholders' ? 'mode-icon active' : 'mode-icon'}"
      on:click={() => activeTab = 'placeholders'}
    >
      Placeholders
    </button>
  </div>

  {#if activeTab === 'general'}
    <div class="space-y-6">
      <div class="space-y-4">
        <h2 class="text-lg font-semibold">Restore Defaults</h2>
        <p>
          Restoring defaults will revert all settings back to their original state, including modes, prompts, and presets. Your API keys will remain intact.
        </p>
        <Button variant="danger" class="w-full" on:click={() => showConfirmRestore = true}>Restore Defaults</Button>
        <ConfirmationDialog open={showConfirmRestore} on:close={() => showConfirmRestore = false}>
          <p>
            Are you sure you want to restore the defaults? Any custom modes, presets, or prompts you created will be lost.
          </p>
          <div class="flex justify-center mt-4 space-x-4">
            <Button variant="secondary" on:click={() => showConfirmRestore = false}>Cancel</Button>
            <Button variant="danger" on:click={onConfirmRestore}>Yes, Restore</Button>
          </div>
        </ConfirmationDialog>
      </div>

      {#if providers.length}
        <div class="space-y-4">
          <h2 class="text-lg font-semibold">API Keys</h2>
          <p>
            Select a provider to set or update your API key.
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {#each providers as provider}
              <div>
                <Button variant="secondary" class="w-full" on:click={() => setProviderKey(provider)}>{provider}</Button>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <div class="space-y-4">
        <h2 class="text-lg font-semibold">Interpolations</h2>
        <h3 class="text font-semibold">Language Instructions</h3>
        <p>
          This section is under development.
        </p>
      </div>
    </div>
  {:else if activeTab === 'modes'}
    <ModeSettings on:getPrompts />
  {:else if activeTab === 'presets'}
    <PresetSettings />
  {:else if activeTab === 'prompts'}
    <PromptSettings on:getPrompts />
  {:else if activeTab === 'placeholders'}
    <PlaceholderSettings />
  {/if}
</div>

<style lang="scss">
  .mode-icon {
    border-bottom: 2px solid transparent;
  }

  .mode-icon.active {
    border-bottom: 2px solid var(--vscode-activityBar-activeBorder);
  }
</style>
