/**
 * The 404, in both shells.
 *
 * Reachable only from injected state — every link and nav item lands on a
 * member of the `View` union — so it exists to be honest rather than to be
 * found. It offers the way back that belongs to whoever is looking.
 */

import { useI18n } from "../i18n/index.tsx";
import { Button, Mono } from "../components/Primitives.tsx";
import { useStore } from "../state/store.ts";

export default function NotFound() {
  const { t } = useI18n();
  const persona = useStore((s) => s.persona);
  const go = useStore((s) => s.go);

  return (
    <section className="wh-404 wh-screen">
      <Mono className="wh-404__code">{t("notfound.code")}</Mono>
      <h1 className="wh-404__title">{t("notfound.title")}</h1>
      <p className="wh-404__body">{t("notfound.body")}</p>
      <Button onClick={() => go(persona === "desk" ? "today" : "home")}>
        {t(persona === "desk" ? "notfound.desk" : "notfound.guest")}
      </Button>
    </section>
  );
}
