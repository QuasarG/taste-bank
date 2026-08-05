import type { APIRoute } from 'astro';
import { assertAdmin } from '@lib/admin';
import { createInvite } from '@lib/invites';
import { markServed } from '@lib/applicants';
import { sendMail, isMailConfigured } from '@lib/mail';
import { json, apiError } from '@lib/api-utils';
import crypto from 'node:crypto';

export const POST: APIRoute = async ({ params, request }) => {
  try {
    assertAdmin(request);
    const email = decodeURIComponent(params.email || '').toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: '邮箱无效' }, 400);
    }

    // 生成邀请码
    const code = createInvite(email);
    // 邀请码 hash（用于记录，不存明文）
    const inviteHash = crypto.createHash('sha256').update(code).digest('hex');

    // 发邮件给申请者
    // 标记 served（即使邮件失败也标记，码已生成）
    markServed(email, inviteHash);

    const mailResult = await sendMail({
      to: email,
      subject: '[Taste Bank] Your invite code is here',
      text: `Thanks for your interest in Taste Bank!

Your invite code: ${code}

This code lets you submit your own front-end styles to the library. Here are three ways to configure it:

──────────────────────────────────────
Option 1: Run setup (recommended)
──────────────────────────────────────
If you haven't set up Taste Bank yet, just run:

  npx taste-bank setup

Then save your invite code:

  taste-bank config invite ${code}

Setup will also install the CLI, inject skills into your agents, and guide you through identity setup (keypair + author name).

──────────────────────────────────────
Option 2: Tell your agent
──────────────────────────────────────
If your agent already has the taste-bank skill, just say:

  "Configure my Taste Bank invite code: ${code}"

Your agent will handle the rest.

──────────────────────────────────────
Option 3: Manual
──────────────────────────────────────
Write the code to ~/.style-lab/config.json:

  { "inviteCode": "${code}" }

You'll also need a keypair (run: taste-bank keygen) and an author name (run: taste-bank config author <your-name>) before submitting.

──────────────────────────────────────
What's next?
──────────────────────────────────────
1. Browse existing styles: taste-bank list
2. Try a style: taste-bank skill <slug>
3. Submit your own: taste-bank submit <pack.json>

Need help? Visit https://tastebank.cloud/quick-start

— Taste Bank`,
      html: `<div style="font-family:-apple-system,system-ui,sans-serif;max-width:560px;margin:0 auto;color:#333;line-height:1.6">
<h2 style="color:#126984;border-bottom:2px solid #126984;padding-bottom:8px">Thanks for your interest in Taste Bank!</h2>
<p>Your invite code:</p>
<div style="text-align:center;margin:16px 0"><span style="font-size:1.4em;font-weight:bold;background:#f0f4f4;padding:12px 24px;border-radius:6px;letter-spacing:0.05em">${code}</span></div>
<p style="color:#666;font-size:0.9em">This code lets you submit your own front-end styles to the library.</p>

<h3 style="color:#126984;margin-top:24px">Option 1: Run setup <span style="font-size:0.8em;color:#999">(recommended)</span></h3>
<p>If you haven't set up Taste Bank yet, just run:</p>
<pre style="background:#1a1b26;color:#e0af68;padding:12px 16px;border-radius:6px;overflow-x:auto">npx taste-bank setup</pre>
<p>Then save your invite code:</p>
<pre style="background:#1a1b26;color:#e0af68;padding:12px 16px;border-radius:6px;overflow-x:auto">taste-bank config invite ${code}</pre>
<p style="font-size:0.9em;color:#666">Setup also installs the CLI, injects skills into your agents, and guides identity setup.</p>

<h3 style="color:#126984;margin-top:24px">Option 2: Tell your agent</h3>
<p>If your agent already has the taste-bank skill, just say:</p>
<pre style="background:#1a1b26;color:#9aa5ce;padding:12px 16px;border-radius:6px;overflow-x:auto">"Configure my Taste Bank invite code: ${code}"</pre>

<h3 style="color:#126984;margin-top:24px">Option 3: Manual</h3>
<p>Write to <code>~/.style-lab/config.json</code>:</p>
<pre style="background:#1a1b26;color:#9aa5ce;padding:12px 16px;border-radius:6px;overflow-x:auto">{ "inviteCode": "${code}" }</pre>
<p style="font-size:0.9em;color:#666">You'll also need: <code>taste-bank keygen</code> (keypair) and <code>taste-bank config author &lt;name&gt;</code> before submitting.</p>

<h3 style="color:#126984;margin-top:24px">What's next?</h3>
<ul>
<li>Browse: <code>taste-bank list</code></li>
<li>Try: <code>taste-bank skill &lt;slug&gt;</code></li>
<li>Submit: <code>taste-bank submit &lt;pack.json&gt;</code></li>
</ul>
<p style="margin-top:20px"><a href="https://tastebank.cloud/quick-start" style="color:#126984">Need help? Visit Quick Start →</a></p>
<hr style="border:none;border-top:1px solid #eee;margin:20px 0">
<p style="color:#999;font-size:0.8em">— Taste Bank</p>
</div>`,
    });

    return json({
      ok: true,
      email,
      code: mailResult.ok ? undefined : code, // 邮件失败时返回码让 admin 手动发
      mailed: mailResult.ok,
      mailReason: mailResult.ok ? undefined : mailResult.reason,
    });
  } catch (e) {
    return apiError(e);
  }
};
