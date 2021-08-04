<template>
  <div class="home" @click="focusInput">
    <div
      v-for="(cmd, i) in tasoShell.history"
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
import { TasoKernel } from '@/models/tasoKernel';
import { TasoShell } from '@/models/tasoShell';

export default defineComponent({
  name: 'Home',
  components: {
    CmdLine
  },
  setup() {
    const cmdLineRef = ref();
    const tasoShell = reactive<TasoShell>(new TasoShell());

    const bootBIOS = async() => {
      const tasoKernel = new TasoKernel();
      await tasoKernel.boot(tasoShell);
      getInput();
    };

    const getInput = async() => {
      const cmd = await cmdLineRef.value.input();
      tasoShell.execCmd(cmd);
      getInput();
      nextTick(() => window.scroll(0, document.documentElement.scrollHeight - window.innerHeight));
    };

    const focusInput = () => {
      if (!String(document.getSelection()).length) {
        cmdLineRef.value.inputRef.focus();
      }
    };

    onMounted(async() => {
      await bootBIOS();
    });

    return {
      cmdLineRef,
      tasoShell,
      focusInput
    };
  }
});
</script>
