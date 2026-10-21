const fs = require('node:fs');
const path = require('node:path');
const changes = {
  '011': {
    phrases: [
      ['work-01','agree on a shared set of…','先对齐共同使用的问题与标准','agree on a shared set of + questions / criteria','Could we agree on a shared set of role-related questions before the next round?','我们能否先为下一轮面试统一一套岗位相关问题？'],
      ['work-02','a fairer basis for comparing…','为候选人比较提供更公平的依据','a basis for + 名词 / 动名词','That would give us a fairer basis for comparing each candidate’s answers.','这样我们就能更公平地比较每位候选人的回答。'],
      ['work-03','use the same scoring criteria','所有候选人使用同一套评分标准','use the same criteria for + 名词','Could we use the same scoring criteria for every candidate?','我们能否对每位候选人使用同一套评分标准？']
    ],
    practice: [
      ['我们能否先为下一轮面试统一一套岗位相关问题？','Could we agree on a shared set of role-related questions before the next round?','agree on a shared set 提议所有面试官共同使用一套问题。'],
      ['这样我们就能更公平地比较每位候选人的回答。','That would give us a fairer basis for comparing each candidate’s answers.','a fairer basis for comparing 说明统一做法如何帮助公平比较。']
    ]
  },
  '013': {
    phrases: [
      ['work-01','We’re still discussing the next step.','告知对方团队仍在讨论下一步','still be + 动词-ing','We’re still discussing the next step.','我们还在讨论下一步。'],
      ['work-02','send you an update','承诺之后提供进展','send someone an update','I’ll send you an update as soon as the team makes a decision.','团队作出决定后，我会尽快给你更新。'],
      ['work-03','by Friday','说明最迟回复的时间','by + 星期 / 日期 / 时间','Could you let me know by Friday whether this new time works for you?','你能否在周五前告诉我这个新时间是否合适？']
    ],
    practice: [
      ['我们还在讨论下一步。','We’re still discussing the next step.','still be + 动词-ing 表示讨论仍在进行，尚未定案。'],
      ['你能否在周五前告诉我这个新时间是否合适？','Could you let me know by Friday whether this new time works for you?','by Friday 给出最迟回复时间；whether 引出需要确认的事项。']
    ]
  },
  '016': {
    phrases: [
      ['work-01','Would you be willing to…?','礼貌询问对方是否愿意承担一件事','Would you be willing to + 动词原形?','Would you be willing to lead a short role-play for the new support agents?','你愿意为新客服带一次简短的角色练习吗？'],
      ['work-02','walk someone through…','带对方逐步了解某个流程','walk someone through + a process / tool','I can walk the new agents through the refund steps first.','我可以先带新客服逐步熟悉退款流程。'],
      ['work-03','collect questions in advance','提前收集听众的问题','collect questions / feedback in advance','We can collect their questions in advance so the practice focuses on what they need.','我们可以提前收集他们的问题，让练习围绕实际需要展开。']
    ],
    practice: [
      ['你愿意为新客服带一次简短的角色练习吗？','Would you be willing to lead a short role-play for the new support agents?','Would you be willing to…? 礼貌询问对方是否愿意承担这项工作。'],
      ['我们可以提前收集他们的问题，让练习围绕实际需要展开。','We can collect their questions in advance so the practice focuses on what they need.','collect questions in advance 表示在活动开始前了解参与者的疑问。']
    ]
  },
  '023': {
    phrases: [
      ['work-01','We value…','说明团队重视的工作方式','value + 名词 / 动名词','We value clear, creative problem-solving and open discussion.','我们重视清晰、有创造性的解决问题方式和开放讨论。'],
      ['work-02','Our goal is to…','说明团队希望达成的目标','Our goal is to + 动词原形','Our goal is to help customers get the information they need with less effort.','我们的目标是让客户更轻松地找到所需信息。'],
      ['work-03','make it easier for someone to…','说明某个做法如何降低他人完成任务的难度','make it + 形容词 + for someone + to do','The new search makes it easier for customers to find setup instructions.','新的搜索功能让客户更容易找到设置说明。']
    ],
    practice: [
      ['我们重视清晰、有创造性的解决问题方式和开放讨论。','We value clear, creative problem-solving and open discussion.','We value… 用来说明团队重视的工作方式。'],
      ['我们的目标是让客户更轻松地找到所需信息。','Our goal is to help customers get the information they need with less effort.','Our goal is to… 用来说明团队希望达成的结果。']
    ]
  },
  '047': {
    phrases: [
      ['work-01','I understand why you’re concerned about…','先承认同事担心的具体问题','understand why + 主语 + be concerned about + 名词 / 动名词','I understand why you’re concerned about using AI in customer replies.','我理解你为什么担心在客户回复中使用 AI。'],
      ['work-02','start with a low-risk use case','从低风险的小场景开始试用','start with + a low-risk use case','Could we start with a low-risk use case, such as drafting internal replies for review?','我们能否从一个低风险场景开始，比如先起草供内部审核的回复？'],
      ['work-03','share what we learn before we expand the test','扩大试用前先分享结果','share what + 主语 + learn / find','Let’s share what we learn with the support team before we expand the test.','扩大试用前，我们先把结果分享给客服团队。']
    ],
    practice: [
      ['我理解你为什么担心在客户回复中使用 AI。','I understand why you’re concerned about using AI in customer replies.','先承认对方担心的具体事项，再继续讨论做法。'],
      ['扩大试用前，我们先把结果分享给客服团队。','Let’s share what we learn with the support team before we expand the test.','先分享试用结果，再决定是否扩大范围。']
    ],
    cloze: [
      ['c1','I understand why you’re ___ about using AI in customer replies.','concerned','concerned about 后接让人担心的事项。'],
      ['c2','Could we start with a low-risk use ___?','case','use case 指产品或工具的一种具体用途。'],
      ['c3','Let’s share what we ___ before we expand the test.','learn','what we learn 指试用中得到的经验。']
    ]
  },
  '054': {
    phrases: [
      ['work-01','walk someone through confirmed support','主动解释目前已确认的支持措施','walk someone through + details / process','I can walk you through the transition support that is confirmed today.','我可以为你说明今天已经确认的过渡支持。'],
      ['work-02','the remaining details','尚待确认的具体事项','remaining details / questions / steps','We still need to confirm the timing and eligibility details.','具体时间和资格条件还需要确认。'],
      ['work-03','follow up once something is confirmed','确定信息后再次联系','follow up once / when + 从句','I’ll follow up once People Operations confirms the next steps.','People Operations 确认后续安排后，我会再联系你。']
    ],
    practice: [
      ['我可以为你说明今天已经确认的过渡支持。','I can walk you through the transition support that is confirmed today.','walk someone through 表示逐项说明流程或具体安排。'],
      ['具体时间和资格条件还需要确认。','We still need to confirm the timing and eligibility details.','remaining details 指尚待确认的事项；本句直接说明哪些细节未定。']
    ]
  }
};
const root = path.resolve(__dirname, '../src/content/work-english');
for (const [id, change] of Object.entries(changes)) {
  const file = path.join(root, id, 'lesson.json');
  const lesson = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const [index, row] of change.phrases.entries()) {
    const [phraseId, word, meaning, collocation, example, translation] = row;
    lesson.taskPhrases[index] = {id:phraseId, word, meaning, collocation, example, translation};
  }
  if (change.practice) lesson.translationPractice = change.practice.map(([prompt,answer,why])=>({prompt,answer,why}));
  if (change.cloze) lesson.cloze = change.cloze.map(([id,prompt,answer,why])=>({id,prompt,answer,why}));
  fs.writeFileSync(file, `${JSON.stringify(lesson, null, 2)}\n`, 'utf8');
}
const grammarFixes = {
  '033': 'but 把风险管理的作用与局限放在一起：方法可以帮助团队识别和处理风险，却不能保证风险归零。',
  '056': 'but 对比了个人工作习惯与共同目标：成员做事方式可以不同，但仍需约定怎样协作。'
};
for (const [id, analysis] of Object.entries(grammarFixes)) {
  const file = path.join(root, id, 'lesson.json');
  const lesson = JSON.parse(fs.readFileSync(file, 'utf8'));
  lesson.structure.analysis[1] = analysis;
  fs.writeFileSync(file, `${JSON.stringify(lesson, null, 2)}\n`, 'utf8');
}
console.log(`Deduplicated 18 task expressions and clarified 2 sentence analyses.`);
