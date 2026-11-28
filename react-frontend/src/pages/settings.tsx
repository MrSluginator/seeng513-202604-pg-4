import styles from '../assets/styles/settings.module.css';
import { Icon } from '../molecules';

function Settings() {
  return (
    <div className={styles.page}>

      {/* Settings sidebar */}
      <aside className={styles.sidebar}>
        <button
          type="button"
          className={`${styles.sidebarItem} ${styles.active}`}
        >
          Account
        </button>

        <button type="button" className={styles.sidebarItem}>
          Connect Socials
        </button>

        <button type="button" className={styles.sidebarItem}>
          Privacy
        </button>

        <button type="button" className={styles.sidebarItem}>
          Preferences
        </button>

        <button type="button" className={styles.sidebarItem}>
          Notifications
        </button>
      </aside>

      {/* Account content */}
      <main className={styles.content}>
        <h1 className={styles.heading}>
          <span className={styles.mobileBack}>‹</span>
          Account
        </h1>

        {/* Profile picture */}
        <div className={`${styles.settingRow} ${styles.profileRow}`}>
          <label>Profile Picture</label>

          <div className={styles.profileContainer}>
            <div className={styles.profilePicture}></div>

            <button
              type="button"
              className={styles.profileButton}
              aria-label="Change profile picture"
            >
              <Icon name="settings" />
            </button>
          </div>
        </div>

        {/* Username */}
        <div className={styles.settingRow}>
          <label htmlFor="username">Username</label>

          <input
            id="username"
            type="text"
            placeholder="USERNAME"
            className={styles.input}
          />
        </div>

        {/* Bio */}
        <div className={styles.settingRow}>
          <label htmlFor="bio">Bio</label>

          <input
            id="bio"
            type="text"
            placeholder="Bio here..."
            className={styles.input}
          />
        </div>

        {/* Email */}
        <div className={styles.settingRow}>
          <label htmlFor="email">Email</label>

          <input
            id="email"
            type="email"
            placeholder="email@gmail.ca"
            className={styles.input}
          />
        </div>

        {/* Phone number */}
        <div className={styles.settingRow}>
          <label htmlFor="phone">Phone Number</label>

          <input
            id="phone"
            type="tel"
            placeholder="+1 234 567 8910"
            className={styles.input}
          />
        </div>

        {/* Password */}
        <div className={styles.settingRow}>
          <label htmlFor="password">Password</label>

          <div className={styles.passwordContainer}>
            <button
              type="button"
              className={styles.resetButton}
            >
              Reset Password
            </button>

            <input
              id="password"
              type="password"
              placeholder="********"
              className={`${styles.input} ${styles.passwordInput}`}
              disabled
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default Settings;