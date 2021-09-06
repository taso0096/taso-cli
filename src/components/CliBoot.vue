<template>
  <div class="cli-boot">
    <template v-if="bootIndex <= biosTextList.length">
      <div
        v-for="(text, i) in biosTextList.slice(0, bootIndex)"
        :key="i"
      >{{ text }}</div>
    </template>
    <template v-else-if="bootIndex <= biosTextList.length + kernelTextList.length">
      <div
        v-for="(text, i) in kernelTextList.slice(0, bootIndex - biosTextList.length)"
        :key="i"
      >{{ text }}</div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.cli-boot {
  padding: 1px 6px;
  word-break: break-word;
  white-space: pre-wrap;
}
</style>

<script lang="ts">
import { defineComponent, ref, reactive } from 'vue';

export default defineComponent({
  name: 'CmdResult',
  setup() {
    const bootIndex = ref<number>(0);
    const biosTextList = reactive<string[]>([
      'starting Browser...',
      'Found Boot script /boot.ts\nDecompressing kernel...',
      'Uncompressed size: 17,338 bytes\nBooting taso-cli...',
      '\nStarting kernel...'
    ]);
    const kernelTextList = reactive<string[]>([
      'This website uses Google Analytics, an access analysis tool by Google.\nBy remaining on this site, you are deemed to have agreed to this.\nFor more information, please see "~/privacy-policy.md".\n\nPress any key or click to continue...',
      '\nRegistered shell with kernel.\n\nStarting shell...'
    ]);

    const next = async(msec = 0): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, msec));
      bootIndex.value++;
    };

    return {
      bootIndex,
      biosTextList,
      kernelTextList,
      next
    };
  }
});
</script>
