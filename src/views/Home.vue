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
      <cmd-result
        v-if="tasoShell.results[i]"
        :result="tasoShell.results[i]"
      />
    </div>
    <cmd-line
      v-if="!tasoShell.history.length || tasoShell.results[tasoShell.history.length - 1]"
      ref="cmdLineRef"
      :cd="tasoShell.getCdName()"
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
      nextTick(() => focusInput());
      const cmd = await cmdLineRef.value.input();
      await tasoShell.execCmd(cmd);
      nextTick(() => {
        getInput();
        window.scroll(0, document.documentElement.scrollHeight - window.innerHeight);
      });
    };

    const focusInput = () => {
      if (!String(document.getSelection()).length) {
        nextTick(() => cmdLineRef.value.inputRef.focus());
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
