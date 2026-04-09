import type { PendingWriteAction } from '../types';
import { buildCreateMaterialAction, runMaterialQuery } from '../tools/material-tools';

export const LOCAL_AGENT_BOOT_MESSAGE =
  '这是零 API 成本本地 PoC。\n\n- 读示例：`查询物料 关键词: 棉布 类型: fabric`\n- 写示例：`新增物料 名称: 40支精棉汗布, 类型: fabric, 单位: 米, 单价: 28.5, 颜色: 白色,黑色`\n\n写操作会先生成确认卡片，点击后才真正调用现有接口。';

type LocalAgentResult = {
  markdown: string;
  pendingAction?: PendingWriteAction;
};

export const handleLocalAgentRequest = async (input: string, actionId: string): Promise<LocalAgentResult> => {
  const wantsRead = /查询|查找|搜索/.test(input);
  const wantsWrite = /新增物料|录入物料/.test(input);

  if (wantsWrite) {
    const parsed = buildCreateMaterialAction(input, actionId);
    if (!parsed.action) {
      return {
        markdown: `无法生成写入动作：${parsed.error ?? '参数不完整'}\n\n可参考：\`新增物料 名称: 40支精棉汗布, 类型: fabric, 单位: 米, 单价: 28.5\``,
      };
    }
    return {
      markdown: `已生成待确认写操作：**${parsed.action.summary}**。\n\n请确认后执行。`,
      pendingAction: parsed.action,
    };
  }

  if (wantsRead) {
    const markdown = await runMaterialQuery(input);
    return { markdown };
  }

  return {
    markdown:
      '暂时只支持“物料查询”和“新增物料”两个场景。\n\n- `查询物料 关键词: 棉布 类型: fabric`\n- `新增物料 名称: 牛津布, 类型: fabric, 单位: 米, 单价: 25.5`',
  };
};
