<template>
  <div class="home" @click="focusInput">
    <div
      v-for="(data, i) in tasoShell.history"
      :key="i"
    >
      <cmd-line
        :cd="data.cd"
        :cmd="data.cmd"
      />
      <cmd-result :result="tasoShell.results[i]" />
    </div>
    <cmd-line
      ref="cmdLineRef"
      :cd="tasoShell.getTrimCd()"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, onMounted, nextTick } from 'vue';
import CmdLine from '@/components/CmdLine.vue';
import CmdResult from '@/components/CmdResult.vue';

import { TasoKernel } from '@/models/tasoKernel';
import { TasoShell } from '@/models/tasoShell';

export default defineComponent({
  name: 'Home',
  components: {
    CmdLine,
    CmdResult
  },
  setup() {
    const cmdLineRef = ref();
    const tasoShell = reactive<TasoShell>(new TasoShell());

    const bootBIOS = async() => {
      const tasoKernel = new TasoKernel(tasoShell);
      await tasoKernel.boot();
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
