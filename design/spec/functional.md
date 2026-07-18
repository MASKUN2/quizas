# 4. Functional Requirements

Part of the [quizas specification](./README.md).

## 4.1 Posts (Author)
- Create a post with: title, slug, Markdown body, category (required), optional
  summary, optional tags, optional series + position.
- Save a post as a **draft** or **publish** it.
- Edit any field of an existing post, including changing its publication state.
- **Autosave while writing.** The editor persists changes automatically — at most
  once a minute, and only when something changed since the last save — so
  in-progress writing survives an accidental navigation or reload. Autosave
  **never changes publication state**: it never publishes a draft (publishing is
  only ever an explicit action) and never unpublishes a post. It applies to
  **drafts and published posts alike** — for a **published** post the autosaved
  edit is saved to the live post and is visible to readers immediately, so the
  editor flags this state distinctly ("saved & live"). The editor shows the
  current autosave state ([§7.5](./ui-design.md#75-shared-ui-patterns)).
- Delete a post, **confirmed via a modal dialog** so it never fires on a stray
  click ([§7.5](./ui-design.md#75-shared-ui-patterns)). Deletion is a **soft
  delete**: the post and its comments are hidden from every surface and its slug
  is released, but the data is retained and recoverable from the database — it is
  not a permanent erase ([§5.3](./policies.md#53-relationships--integrity)).
- View a list of **all** posts — drafts included — with their current state
  clearly distinguished.
- **Jump straight from a published post's public page to its editor** while
  signed in as the author — an author-only shortcut that readers never see.
- **Insert images into the Markdown body** by pasting (e.g. a screenshot),
  dragging a file onto the editor, or choosing a file. The image is uploaded and
  a Markdown image reference is inserted automatically at the cursor. Images are
  content within the body — there is no separate cover-image field (see
  [§8](./README.md#8-out-of-scope-this-version)).
- **Toggle the body editor between edit and preview** to see the rendered
  Markdown — including uploaded images — before publishing.

## 4.2 Posts (Reader)
- Browse a list of published posts, newest first.
- Read a single published post by its slug.
- Navigate to a post's category, its tags, and its series.
- Reading time is shown when available.

## 4.3 Taxonomy
- Browse all posts within a category.
- Browse all posts carrying a tag.
- Category and tag pages list only published posts.

## 4.4 Series
- Author can create, edit, and delete a series (title, slug, optional
  description).
- Author can assign a post to a series and set its order.
- Readers can browse a series index and a single series page that lists its
  posts **in author-defined order**.
- A post page links to its series when it belongs to one.

## 4.5 Comments (Reader)
- Submit a comment on a published post with: name (required), comment body
  (required), email (optional).
- Optionally reply to an existing comment on the same post.
- See only **approved** comments on a post.
- Receive clear feedback that a submission was received and is awaiting review.

## 4.6 Comments (Author / Moderation)
- View comments filtered by state: pending, approved, spam.
- Approve a pending comment, mark a comment as spam, or return it to pending.
- Delete a comment.
- See which post each comment belongs to.
