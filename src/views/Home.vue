<template>
  <div class="home" @click="focusInput">
    <div
      v-for="(cmd, i) in cmdHistory"
      :key="i"
    >
      <cmd-line :cmd="cmd" />
    </div>
    <cmd-line ref="cmdLineRef" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, onMounted, nextTick } from 'vue';
import CmdLine from '@/components/CmdLine.vue';
import { Result } from '@/types/cmdLine';

export default defineComponent({
  name: 'Home',
  components: {
    CmdLine
  },
  setup() {
    const cmdLineRef = ref();
    const cmdHistory = reactive<string[]>([]);
    const cmdResults = reactive<Result[]>([]);

    const getInput = async() => {
      const cmd = await cmdLineRef.value.input();
      const result: Result = {
        type: null,
        data: null
      };
      cmdHistory.push(cmd);
      cmdResults.push(result);
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
      cmdHistory,
      cmdResults,
      focusInput
    };
  }
});
</script>
