# 4. Functional Requirements

Part of the [quizas specification](./README.md).

## 4.1 Posts (Author)
- Create a post with: title, slug, Markdown body, category (required), optional
  summary, optional tags, optional series + position.
- Save a post as a **draft** or **publish** it.
- Edit any field of an existing post, including changing its publication state.
- Delete a post.
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
