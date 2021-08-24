<template>
  <div class="home" @click="focusInput">
    <div
      v-for="(data, i) in tasoShell.history.slice(tasoShell.historyStartIndex)"
      :key="i"
    >
      <cmd-line
        :cd="data.cd"
        :cmd="data.cmd"
      />
      <cmd-result
        v-if="tasoShell.results[i + tasoShell.historyStartIndex]"
        :result="tasoShell.results[i + tasoShell.historyStartIndex]"
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
import { defineComponent, ref, reactive, onMounted, nextTick, watchEffect } from 'vue';
import { useRouter } from 'vue-router';

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
    const router = useRouter();

    const cmdLineRef = ref<InstanceType<typeof CmdLine>>();
    const tasoShell = reactive<TasoShell>(new TasoShell(router.currentRoute.value.query.path as string));

    const bootBIOS = async(): Promise<void> => {
      const tasoKernel = new TasoKernel();
      await tasoKernel.boot(tasoShell);
    };

    const getInput = async(): Promise<void> => {
      if (!cmdLineRef.value) {
        return;
      }
      nextTick(() => focusInput());
      const cmd = await cmdLineRef.value.input();
      await tasoShell.execCmd(cmd);
      nextTick(() => {
        getInput();
        window.scroll(0, document.documentElement.scrollHeight - window.innerHeight);
      });
    };

    const focusInput = (): void => {
      if (!String(document.getSelection()).length) {
        nextTick(() => {
          if (cmdLineRef.value?.inputRef) {
            tasoShell.registerInputRef(cmdLineRef.value.inputRef);
            cmdLineRef.value.inputRef.focus();
            const range = document.createRange();
            const textNode = cmdLineRef.value?.inputRef?.childNodes[0];
            if (textNode) {
              range.setStart(textNode, textNode.textContent?.length || 0);
              const sel = window.getSelection();
              if (sel) {
                sel.removeAllRanges();
                sel.addRange(range);
              }
            }
          }
        });
      }
    };

    onMounted(async(): Promise<void> => {
      await bootBIOS();
      const cmd = router.currentRoute.value.query.cmd;
      if (cmd) {
        await tasoShell.execCmd({
          type: 'text',
          data: cmd as string
        });
      }
      await router.push({
        path: tasoShell.cd
      });
      getInput();
    });

    watchEffect(() => {
      router.push({
        path: tasoShell.cd,
        query: router.currentRoute.value.query
      });
    });

    return {
      cmdLineRef,
      tasoShell,
      focusInput
    };
  }
});
</script>
