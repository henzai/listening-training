import { NavLink, Outlet } from "react-router-dom";
import styles from "./Layout.module.css";

export function Layout() {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <Outlet />
      </main>
      <nav className={styles.nav}>
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
      </nav>
    </div>
  );
}
