// 邀请码邮件模板（双语），apply-invite 确认 + auto-approve + send 共用
export const inviteMail = {
  zh: {
    subject: '[Taste Bank] 你的邀请码',
    text: (code: string) => `感谢你对 Taste Bank 的关注！

你的邀请码：${code}

三种方式完成配置：

方式一：运行 setup（推荐）
  npx taste-bank setup
  taste-bank config invite ${code}

方式二：告诉你的 agent
"配置我的 Taste Bank 邀请码：${code}"

方式三：手动
写入 ~/.style-lab/config.json：{ "inviteCode": "${code}" }

投稿前还需要：taste-bank keygen + taste-bank config author <名字>

接下来？
浏览：taste-bank list / 试用：taste-bank skill <slug> / 投稿：taste-bank submit

需要帮助？访问 https://tastebank.cloud/quick-start

— Taste Bank`,
    html: (code: string) => `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#333;line-height:1.6">
<h2 style="color:#126984;border-bottom:2px solid #126984;padding-bottom:8px">感谢你对 Taste Bank 的关注！</h2>
<p>你的邀请码：</p>
<div style="text-align:center;margin:16px 0"><span style="font-size:1.4em;font-weight:bold;background:#f0f4f4;padding:12px 24px;border-radius:6px;letter-spacing:0.05em">${code}</span></div>
<h3 style="color:#126984;margin-top:24px">方式一：运行 setup <span style="font-size:0.8em;color:#999">（推荐）</span></h3>
<pre style="background:#1a1b26;color:#e0af68;padding:12px 16px;border-radius:6px;overflow-x:auto">npx taste-bank setup</pre>
<pre style="background:#1a1b26;color:#e0af68;padding:12px 16px;border-radius:6px;overflow-x:auto">taste-bank config invite ${code}</pre>
<h3 style="color:#126984;margin-top:24px">方式二：告诉你的 agent</h3>
<pre style="background:#1a1b26;color:#9aa5ce;padding:12px 16px;border-radius:6px;overflow-x:auto">"配置我的 Taste Bank 邀请码：${code}"</pre>
<h3 style="color:#126984;margin-top:24px">方式三：手动</h3>
<pre style="background:#1a1b26;color:#9aa5ce;padding:12px 16px;border-radius:6px;overflow-x:auto">{ "inviteCode": "${code}" }</pre>
<p style="font-size:0.9em;color:#666">投稿前还需要：<code>taste-bank keygen</code> + <code>taste-bank config author &lt;名字&gt;</code></p>
<h3 style="color:#126984;margin-top:24px">接下来？</h3>
<ul><li>浏览：<code>taste-bank list</code></li><li>试用：<code>taste-bank skill &lt;slug&gt;</code></li><li>投稿：<code>taste-bank submit</code></li></ul>
<p style="margin-top:20px"><a href="https://tastebank.cloud/quick-start" style="color:#126984">需要帮助？→</a></p>
<hr style="border:none;border-top:1px solid #eee;margin:20px 0"><p style="color:#999;font-size:0.8em">— Taste Bank</p></div>`,
  },
  en: {
    subject: '[Taste Bank] Your invite code',
    text: (code: string) => `Thanks for your interest in Taste Bank!

Your invite code: ${code}

Option 1: Run setup (recommended)
  npx taste-bank setup
  taste-bank config invite ${code}

Option 2: Tell your agent
"Configure my Taste Bank invite code: ${code}"

Option 3: Manual
~/.style-lab/config.json: { "inviteCode": "${code}" }

Before submitting: taste-bank keygen + taste-bank config author <name>

What's next?
Browse: taste-bank list / Try: taste-bank skill <slug> / Submit: taste-bank submit

Need help? Visit https://tastebank.cloud/quick-start

— Taste Bank`,
    html: (code: string) => `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#333;line-height:1.6">
<h2 style="color:#126984;border-bottom:2px solid #126984;padding-bottom:8px">Thanks for your interest in Taste Bank!</h2>
<p>Your invite code:</p>
<div style="text-align:center;margin:16px 0"><span style="font-size:1.4em;font-weight:bold;background:#f0f4f4;padding:12px 24px;border-radius:6px;letter-spacing:0.05em">${code}</span></div>
<h3 style="color:#126984;margin-top:24px">Option 1: Run setup <span style="font-size:0.8em;color:#999">(recommended)</span></h3>
<pre style="background:#1a1b26;color:#e0af68;padding:12px 16px;border-radius:6px;overflow-x:auto">npx taste-bank setup</pre>
<pre style="background:#1a1b26;color:#e0af68;padding:12px 16px;border-radius:6px;overflow-x:auto">taste-bank config invite ${code}</pre>
<h3 style="color:#126984;margin-top:24px">Option 2: Tell your agent</h3>
<pre style="background:#1a1b26;color:#9aa5ce;padding:12px 16px;border-radius:6px;overflow-x:auto">"Configure my Taste Bank invite code: ${code}"</pre>
<h3 style="color:#126984;margin-top:24px">Option 3: Manual</h3>
<pre style="background:#1a1b26;color:#9aa5ce;padding:12px 16px;border-radius:6px;overflow-x:auto">{ "inviteCode": "${code}" }</pre>
<p style="font-size:0.9em;color:#666">Before submitting: <code>taste-bank keygen</code> + <code>taste-bank config author &lt;name&gt;</code></p>
<h3 style="color:#126984;margin-top:24px">What's next?</h3>
<ul><li>Browse: <code>taste-bank list</code></li><li>Try: <code>taste-bank skill &lt;slug&gt;</code></li><li>Submit: <code>taste-bank submit</code></li></ul>
<p style="margin-top:20px"><a href="https://tastebank.cloud/quick-start" style="color:#126984">Need help? →</a></p>
<hr style="border:none;border-top:1px solid #eee;margin:20px 0"><p style="color:#999;font-size:0.8em">— Taste Bank</p></div>`,
  },
};
