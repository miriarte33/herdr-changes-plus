// Overlays of changes-plus, opened as copies of the same mod (main.js hands them to this class):
//   file menu (popup):     props { menu: { root, on, path, xy } }
//   confirm file (dialog): props { revertFile: { root, on, path, xy } }
//   revert all (dialog):   props { revertAll: { root, on, tracked, fresh } }
// After a git action they set the shared CHANGED key so the panel reloads, remote spaces included.
import { div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { props, closeOverlay, openOverlay, theme, notify, setShared } from "herdr";
import { isNew, revertFile, revertAll, CHANGED } from "./git.js";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export class Overlay {
  init(_props, cx) {
    this.running = false;
    this.handle = cx.focus_handle();
    this.handle.focus();
  }

  close() { closeOverlay(props().overlay); }

  confirmFile() {
    const file = props().menu;
    this.close();
    openOverlay({ mod: "changes-plus", kind: "dialog", width: 420, height: 170, props: { revertFile: file } });
  }

  act(cx) {
    const p = props();
    if (p.menu) { if (p.menu.xy) this.confirmFile(); return; }
    if (this.running) return;
    this.running = true; cx.notify();
    cx.spawn(async (cx) => {
      try {
        if (p.revertFile) await revertFile(p.revertFile); else await revertAll(p.revertAll);
        setShared(CHANGED, Date.now());
        this.close();
      } catch (e) {
        this.running = false;
        notify({ title: p.revertFile ? `Could not revert ${p.revertFile.path}` : "Could not revert all changes", body: String(e.message ?? e).slice(0, 300), level: "error" });
        cx.notify();
      }
    });
  }

  render(cx) {
    const t = theme(), p = props() ?? {};
    const keys = (e, cx) => {
      if (e.key === "escape") this.close();
      else if (e.key === "enter") this.act(cx);
      else return;
      cx.stop_propagation();
    };
    const root = v_flex().id("changes-plus-overlay").track_focus(this.handle).on_key_down(keys).size_full().min_h(0).bg(t.popover).text_color(t.foreground).text_size(12.5);
    if (p.menu) return this.fileMenu(root, t, p.menu);
    const button = (id, label, danger, action) => h_flex().id(id).h(32).px(14).items_center().rounded(8).text_size(12).font_medium().cursor_pointer().hover((s) => s.opacity(0.88))
      .bg(danger ? t.ansi1 : t.raised).text_color(danger ? t.background : t.foreground).when(this.running && danger, (e) => e.opacity(0.6)).on_click(action).child(label);
    const dialog = (title, detail, confirm) => root.p(18).gap(12)
      .child(h_flex().items_center().child(div().flex_1().text_size(15).font_semibold().child(title)).child(div().text_size(11).text_color(t.dim).child("Esc")))
      .child(div().flex_1().min_h(0).whitespace_normal().text_color(t.muted).child(detail))
      .child(h_flex().justify_end().gap(8)
        .child(button("cancel", "Cancel", false, () => this.close()))
        .child(button("confirm", this.running ? "Working…" : confirm, true, (_e, cx) => this.act(cx))));
    if (p.revertFile) {
      const name = p.revertFile.path.split("/").pop();
      return isNew(p.revertFile.xy)
        ? dialog(`Delete ${name}?`, `${p.revertFile.path} was never committed, so it can't be recovered.`, "Delete")
        : dialog(`Revert ${name}?`, `This discards the uncommitted changes to ${p.revertFile.path}, staged and unstaged. It can't be undone.`, "Revert");
    }
    const all = p.revertAll;
    const lost = [all.tracked && `discards the changes to ${plural(all.tracked, "tracked file")}`, all.fresh && `deletes ${plural(all.fresh, "new file")}`].filter(Boolean).join(" and ");
    return dialog("Revert all uncommitted changes?", `This ${lost} in ${all.root}${all.on ? ` on ${all.on}` : ""}, staged changes included. It can't be undone.`, "Revert all");
  }

  fileMenu(root, t, file) {
    const parts = file.path.split("/"), name = parts.pop();
    return root.p(4)
      .child(v_flex().px(10).pt(6).pb(4).gap(1)
        .child(div().font_semibold().truncate().child(name))
        .child(div().text_size(11).text_color(t.dim).truncate().child(parts.length ? parts.join("/") + "/" : "./")))
      .child(file.xy
        ? h_flex().id("revert-file").h(30).px(10).items_center().rounded(6).cursor_pointer().text_color(t.ansi1).hover((s) => s.bg(t.hover))
            .on_click((_e, cx) => this.act(cx)).child(isNew(file.xy) ? "Delete file…" : "Revert changes…")
        : div().h(30).px(10).flex().items_center().text_color(t.dim).child("No uncommitted changes"));
  }
}
