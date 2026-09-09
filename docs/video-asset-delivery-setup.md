# Enabling AEM Assets video delivery to Edge Delivery

This document explains how authored videos are delivered to the live site.

## The codebase fix (Configurable Asset Picker) — DONE

The video block now authors its video with the **Configurable Asset Picker**
(a.k.a. Custom Content Advisor), which is the supported, portable mechanism:

- `blocks/video/_video.json` — the `video` field uses
  `custom-asset-namespace:custom-asset` with a `configUrl` pointing at the
  hosted filter config, plus a companion `videoMimeType` field
  (`custom-asset-namespace:custom-asset-mimetype`).
- `tools/assets-selector/video.config.json` — the hosted filter config. Its
  `filterSchema` restricts the picker to **`video/*`** and to
  **`dam:assetStatus==approved`** (approved videos only).

Why this fixes delivery: when the companion `videoMimeType` is populated by the
picker, the backend emits an **absolute Dynamic Media / Media Bus delivery URL**
in the markup instead of a raw `/content/dam/...` path (which 404s). The block
uses that absolute URL as-is; the old Scene7 rewrite remains only as a legacy
fallback and can be deleted once all videos are re-authored via the picker.

### Prerequisites for the picker to work

1. **The extension must be enabled** for the Universal Editor
   (Configurable Asset Picker / Custom Content Advisor extension).
2. **CORS on the config file.** `tools/assets-selector/video.config.json` is
   fetched by the editor running on `experience.adobe.com`, so the response
   must include `access-control-allow-origin: https://experience.adobe.com`.
   Verify after publish:
   ```bash
   curl -sD- 'https://main--pipeline-test-new--ankanaxeno.aem.page/tools/assets-selector/video.config.json' \
     | grep -i "access-control"
   ```
3. **Approval status must be maintained** in AEM — assets need
   `dam:assetStatus == approved` to appear in the picker.

---

## AEM-side prerequisites (still required for publishing)

Even with the picker, the asset must be publishable to this site. The following
are performed in **AEM Cloud Service / Cloud Manager** by an administrator and
are the original delivery checklist.

## Background — why this is needed

When an author selects a video, the backend delivers it as a **raw DAM path**,
e.g. `<a href="/content/dam/assets-poc/images/my_video.mp4">`. The Edge Delivery
host does not serve DAM binaries at that path, so the reference returns **404**.

Images work because they are ingested into the **Media Bus** and delivered
same-origin as `./media_<hash>.jpg`. The video is *not* ingested, for two
reasons found during investigation:

1. The video lives in `/content/dam/assets-poc/`, which is **outside** the
   site's configured assets folder (`/content/dam/pipelinetestnew`, per
   `.migration/project.json`). Assets only auto-publish when their folder is in
   the site's path mapping.
2. Non-image asset delivery (video/PDF) is an **Early Adopter** capability that
   must be explicitly enabled.

Size is **not** the blocker — the video is ~19 MB, under the 36 MB Media Bus
`.mp4` limit.

> These steps are performed in **AEM Cloud Service / Cloud Manager**, not in this
> Git repository. They require an AEM administrator.

---

## Step 1 — Map `/content/dam/assets-poc/` to the site

Assets auto-publish to an EDS site only when the DAM folder is included in the
site's path mapping. The site is currently mapped to
`/content/dam/pipelinetestnew`.

Choose **one** option:

- **Option A (recommended): move the videos** into the mapped folder, e.g.
  `/content/dam/pipelinetestnew/videos/`. No mapping change needed; keeps all
  site assets under one tree.
- **Option B: extend the mapping** to include `/content/dam/assets-poc/`.
  In AEM, open the site's Edge Delivery configuration and add the additional
  DAM path to the site's asset path mapping.

## Step 2 — Assign the EDS folder configuration + grant tech-account access

For the DAM folder holding the videos:

1. Assign the Edge Delivery **cloud configuration** to the folder (Folder
   Properties → Cloud Configuration), so assets in it are eligible for
   publishing to Edge Delivery.
2. Ensure the auto-created **technical account** (`<hash>@techacct.adobe.com`)
   has **read** access to the folder. If the folder is private, grant access
   explicitly.

## Step 3 — Enable non-image (video) delivery

Video/PDF delivery from AEM Assets to Edge Delivery is an **Early Adopter**
feature. Request enablement for this program/environment via your Adobe contact
if it is not already on. Until enabled, videos will not be ingested into the
Media Bus regardless of folder mapping.

## Step 4 — (Only if the video exceeds limits) processing profile

Not required here (video is under 36 MB), but for future large videos: create an
AEM Assets **processing profile** that produces a rendition named
`edge-delivery-services-mp4`. AEM delivers that rendition automatically when the
original exceeds Edge Delivery limits.

Media Bus limits (from https://www.aem.live/docs/limits):

| Type | Limit |
|------|-------|
| Video (.mp4) | 36 MB (~2 min @ 300 KB/s) |
| Images (.png/.jpg/.avif) | 20 MB |
| PDF | 20 MB |

---

## Verification

After the above, re-preview/publish the page and check the delivered markup:

```bash
curl -s https://main--pipeline-test-new--ankanaxeno.aem.page/<page>.plain.html \
  | grep -i "mp4\|media_"
```

**Success looks like** the video link rewritten to a same-origin Media Bus URL
(`./media_<hash>.mp4` or a human-readable redirect), returning `200 video/mp4`:

```bash
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" \
  "https://main--pipeline-test-new--ankanaxeno.aem.page/media_<hash>.mp4"
```

## Once verified — remove the client-side workaround

When the backend delivers a working same-origin video URL, delete the Scene7
rewrite so the block carries no environment-specific hardcoding:

- In `blocks/video/video.js`, remove `DM_HOST`, `DM_COMPANY`, and the
  `resolveVideoSrc()` DAM-path branch; use the authored reference directly.

This makes the block portable across any client project.

---

## Note on authoring flow (xwalk vs document-based)

This project authors video via the **Universal Editor** reference field, so the
fix is the AEM-side asset delivery configuration above.

The **AEM Assets Sidekick plugin** config (`tools/sidekick/config.json`) applies
only to the **document-based** authoring flow (Word/Google Docs). If you also
use that flow, register the Assets plugin and map the video mime type there:

```json
{
  "id": "assets",
  "title": "Assets",
  "environments": ["edit"],
  "url": "https://experience.adobe.com/solutions/CQ-helix-assets-addon/static-assets/resources/asset-selector.html?extConfigUrl=<your-hosted-config-url>",
  "isPalette": true,
  "passConfig": true
}
```

…and in the hosted `extConfigUrl` config, the video mime mapping:

```json
{
  "blockName": [
    { "mimeType": "video/*", "value": "Video" }
  ]
}
```

For the Universal Editor flow this Sidekick config is **not** the fix — Steps
1–3 are.
