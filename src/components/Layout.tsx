import { useEffect, useRef } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useScrollDirection } from "../hooks/useScrollDirection";
import styles from "./Layout.module.css";

export function Layout() {
  const mainRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const { direction, reset } = useScrollDirection(mainRef, 10);
  const isPractice = pathname.startsWith("/practice");

  useEffect(() => {
    if (pathname) {
      reset();
    }
  }, [pathname, reset]);

  const navHidden = direction === "down";

  return (
    <div className={styles.container}>
      <main
        ref={mainRef}
        className={`${styles.main} ${isPractice ? styles.mainFullscreen : navHidden ? styles.mainNavHidden : ""}`}
      >
        <Outlet />
      </main>
      {!isPractice && (
        <nav className={`${styles.nav} ${navHidden ? styles.navHidden : ""}`}>
          <NavLink to="/" className={({ isActive }) => (isActive ? styles.active : "")} end>
            <span className={styles.icon}>🏠</span>
            <span className={styles.label}>Home</span>
          </NavLink>
          <NavLink to="/generate" className={({ isActive }) => (isActive ? styles.active : "")}>
            <span className={styles.icon}>✨</span>
            <span className={styles.label}>Generate</span>
          </NavLink>
          <NavLink to="/library" className={({ isActive }) => (isActive ? styles.active : "")}>
            <span className={styles.icon}>📚</span>
            <span className={styles.label}>Library</span>
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => (isActive ? styles.active : "")}>
            <span className={styles.icon}>⚙️</span>
            <span className={styles.label}>Settings</span>
          </NavLink>
        </nav>
      )}
    </div>
  );
}
