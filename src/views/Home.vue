<template>
  <div class="home" @click="focusInput">
    <div
      v-for="(cmd, i) in tasoCli.history"
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
import { TasoCli } from '@/models/tasoCli';

export default defineComponent({
  name: 'Home',
  components: {
    CmdLine
  },
  setup() {
    const cmdLineRef = ref();
    const tasoCli = reactive<TasoCli>(new TasoCli());

    const getInput = async() => {
      const cmd = await cmdLineRef.value.input();
      tasoCli.execCmd(cmd);
      getInput();
      nextTick(() => window.scroll(0, document.documentElement.scrollHeight - window.innerHeight));
    };

    const focusInput = () => {
      if (!String(document.getSelection()).length) {
        cmdLineRef.value.inputRef.focus();
      }
    };

    onMounted(async() => {
      await tasoCli.boot();
      getInput();
    });

    return {
      cmdLineRef,
      tasoCli,
      focusInput
    };
  }
});
</script>
