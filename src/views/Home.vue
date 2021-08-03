<template>
  <div class="home" @click="focusInput">
    <div
      v-for="(history, i) in histories"
      :key="i"
    >
      <cmd-line :cmd="history.cmd" />
    </div>
    <cmd-line ref="cmdLineRef" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, onMounted, nextTick } from 'vue';
import CmdLine from '@/components/CmdLine.vue';
import { Result, History } from '@/types/cmdLine';

export default defineComponent({
  name: 'Home',
  components: {
    CmdLine
  },
  setup() {
    const cmdLineRef = ref();
    const histories = reactive<History[]>([]);

    const getInput = async() => {
      const cmd = await cmdLineRef.value.input();
      const result: Result = {
        type: null,
        data: null
      };
      histories.push({ cmd, result });
      getInput();
      nextTick(() => window.scroll(0, document.documentElement.scrollHeight - window.innerHeight));
    };

    const focusInput = () => {
      if (!String(document.getSelection()).length) {
        cmdLineRef.value.inputRef.focus();
      }
    };

    onMounted(() => {
      getInput();
    });

    return {
      cmdLineRef,
      histories,
      focusInput
    };
  }
});
</script>
