import { collectProjectFiles } from "@/lib/project-files";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Json = Record<string, unknown>;

async function gh(
  token: string,
  endpoint: string,
  init?: { method?: string; body?: Json },
): Promise<{ ok: boolean; status: number; data: Json }> {
  const res = await fetch(`https://api.github.com${endpoint}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "kotha-app",
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as Json;
  return { ok: res.ok, status: res.status, data };
}

/** কতগুলো ফাইল যাবে তা দেখায় */
export async function GET() {
  try {
    const files = await collectProjectFiles();
    const totalKb = Math.round(files.reduce((s, f) => s + f.size, 0) / 1024);
    return Response.json({ fileCount: files.length, totalKb });
  } catch {
    return Response.json({ fileCount: 0, totalKb: 0 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string; repo?: string };
    const token = (body.token ?? "").trim();
    const repoName = (body.repo ?? "kotha-app").trim().replace(/[^a-zA-Z0-9._-]/g, "-");

    if (!token) {
      return Response.json({ error: "GitHub টোকেন দিন" }, { status: 400 });
    }

    // ১) ব্যবহারকারী যাচাই
    const me = await gh(token, "/user");
    if (!me.ok) {
      return Response.json(
        {
          error:
            me.status === 401
              ? "টোকেনটি সঠিক নয় বা মেয়াদ শেষ — নতুন টোকেন তৈরি করুন"
              : "GitHub-এ সংযোগ করা যায়নি",
        },
        { status: 400 },
      );
    }
    const owner = String(me.data.login ?? "");

    // ২) রিপোজিটরি তৈরি (না থাকলে)
    let created = false;
    const existing = await gh(token, `/repos/${owner}/${repoName}`);
    if (!existing.ok) {
      const make = await gh(token, "/user/repos", {
        method: "POST",
        body: {
          name: repoName,
          description: "কথা — বাংলা মেসেজিং ও অডিও কল অ্যাপ",
          private: false,
          auto_init: true,
        },
      });
      if (!make.ok) {
        const msg = String(
          (make.data.errors as { message?: string }[] | undefined)?.[0]?.message ??
            make.data.message ??
            "",
        );
        return Response.json(
          {
            error: msg.includes("scope")
              ? "টোকেনে 'repo' অনুমতি নেই — নতুন টোকেনে repo টিক দিন"
              : `রিপো তৈরি করা যায়নি: ${msg || "অজানা সমস্যা"}`,
          },
          { status: 400 },
        );
      }
      created = true;
      // auto_init শেষ হওয়ার জন্য একটু অপেক্ষা
      await new Promise((r) => setTimeout(r, 2500));
    }

    // ৩) ডিফল্ট ব্রাঞ্চ ও বেস কমিট
    const repoInfo = await gh(token, `/repos/${owner}/${repoName}`);
    const branch = String(repoInfo.data.default_branch ?? "main");

    const refRes = await gh(token, `/repos/${owner}/${repoName}/git/ref/heads/${branch}`);
    let baseCommitSha = "";
    let baseTreeSha = "";
    if (refRes.ok) {
      baseCommitSha = String((refRes.data.object as Json)?.sha ?? "");
      const commitRes = await gh(
        token,
        `/repos/${owner}/${repoName}/git/commits/${baseCommitSha}`,
      );
      if (commitRes.ok) baseTreeSha = String((commitRes.data.tree as Json)?.sha ?? "");
    }

    // ৪) সব ফাইল ব্লব হিসেবে আপলোড
    const files = await collectProjectFiles();
    const tree: { path: string; mode: "100644"; type: "blob"; sha: string }[] = [];

    for (const file of files) {
      const blob = await gh(token, `/repos/${owner}/${repoName}/git/blobs`, {
        method: "POST",
        body: { content: file.content, encoding: file.encoding },
      });
      if (!blob.ok) {
        return Response.json(
          { error: `ফাইল আপলোডে সমস্যা: ${file.path}` },
          { status: 400 },
        );
      }
      tree.push({ path: file.path, mode: "100644", type: "blob", sha: String(blob.data.sha) });
    }

    // ৫) ট্রি তৈরি
    const treeRes = await gh(token, `/repos/${owner}/${repoName}/git/trees`, {
      method: "POST",
      body: baseTreeSha ? { base_tree: baseTreeSha, tree } : { tree },
    });
    if (!treeRes.ok) {
      return Response.json({ error: "ফাইল কাঠামো তৈরি করা যায়নি" }, { status: 400 });
    }

    // ৬) কমিট
    const commitRes = await gh(token, `/repos/${owner}/${repoName}/git/commits`, {
      method: "POST",
      body: {
        message: "কথা অ্যাপ — ফোন থেকে আপলোড",
        tree: String(treeRes.data.sha),
        parents: baseCommitSha ? [baseCommitSha] : [],
      },
    });
    if (!commitRes.ok) {
      return Response.json({ error: "কমিট তৈরি করা যায়নি" }, { status: 400 });
    }

    // ৭) ব্রাঞ্চ আপডেট
    const newSha = String(commitRes.data.sha);
    const update = await gh(token, `/repos/${owner}/${repoName}/git/refs/heads/${branch}`, {
      method: "PATCH",
      body: { sha: newSha, force: true },
    });
    if (!update.ok) {
      const add = await gh(token, `/repos/${owner}/${repoName}/git/refs`, {
        method: "POST",
        body: { ref: `refs/heads/${branch}`, sha: newSha },
      });
      if (!add.ok) {
        return Response.json({ error: "ব্রাঞ্চ আপডেট করা যায়নি" }, { status: 400 });
      }
    }

    const repoUrl = `https://github.com/${owner}/${repoName}`;
    return Response.json({
      ok: true,
      owner,
      repo: repoName,
      created,
      fileCount: files.length,
      repoUrl,
      vercelUrl: `https://vercel.com/new/clone?repository-url=${encodeURIComponent(repoUrl)}`,
      message: `✅ ${files.length}টি ফাইল GitHub-এ আপলোড হয়েছে`,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "আপলোড করা যায়নি" },
      { status: 500 },
    );
  }
}
