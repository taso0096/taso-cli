<template>
  <div class="home">
    <cli-boot
      v-if="!tasoShell.tasoKernel"
      ref="cliBootRef"
    />
    <template v-else>
      <div
        v-for="(data, i) in tasoShell.history.slice(tasoShell.historyStartIndex)"
        :key="i"
      >
        <cmd-line
          v-if="data.cd"
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
      <cmd-result
        v-if="tasoShell.tasoKernel?.tmpTabCmd && tasoShell.tasoKernel.candidateList.length"
        :result="{
          type: 'files',
          data: tasoShell.tasoKernel.candidateList
        }"
      />
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, onMounted, nextTick, watchEffect, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';

import CliBoot from '@/components/CliBoot.vue';
import CmdLine from '@/components/CmdLine.vue';
import CmdResult from '@/components/CmdResult.vue';

import { TasoKernel } from '@/tasoCli/kernel';
import { TasoShell } from '@/tasoCli/shell';

export default defineComponent({
  name: 'Home',
  components: {
    CliBoot,
    CmdLine,
    CmdResult
  },
  setup() {
    const router = useRouter();

    const cliBootRef = ref<InstanceType<typeof CliBoot>>();
    const cmdLineRef = ref<InstanceType<typeof CmdLine>>();
    const tasoShell = reactive<TasoShell>(new TasoShell(router.currentRoute.value.query.path as string));

    const bootBIOS = async(): Promise<void> => {
      if (!cliBootRef.value) {
        return;
      }
      await cliBootRef.value.next();
      await cliBootRef.value.next(1000);
      const tasoKernel = new TasoKernel(cliBootRef.value);
      await cliBootRef.value.next(500);
      await cliBootRef.value.next(1000);
      await tasoKernel.boot(tasoShell as TasoShell);
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
      document.addEventListener('click', focusInput);
    });

    onBeforeUnmount((): void => {
      document.removeEventListener('click', focusInput);
    });

    watchEffect(() => {
      document.title = `taso-cli:${tasoShell.getCdName()}`;
      router.push({
        path: tasoShell.cd,
        query: router.currentRoute.value.query
      });
    });

    return {
      cliBootRef,
      cmdLineRef,
      tasoShell,
      focusInput
    };
  }
});
</script>
