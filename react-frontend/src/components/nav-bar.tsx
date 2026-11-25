import React from 'react';
import styles from '../assets/styles/nav-bar.module.css';
import { Button, Icon, Logo, TextInput } from '../molecules';
import { NavLink, useNavigate } from 'react-router-dom';

interface NavBarProps {
  signedIn: boolean;
}

function NavItem({
  to,
  children,
  end = false,
}: {
  to: string;
  children: React.ReactNode;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        isActive ? `${styles.link} ${styles.active}` : styles.link
      }
    >
      {children}
    </NavLink>
  );
}

function NavBar({ signedIn }: NavBarProps) {
  const navigate = useNavigate();
  const onSettingsClick = () => navigate('/settings');
  const onSignInClick = () => navigate('/sign_in');

  return (
    <div className={styles.box}>
      <div className={styles.mobile}>
        <NavItem to="/map">
          <Icon name="map" />
        </NavItem>
        <NavItem to="/saved">
          <Icon name="bookmark" />
        </NavItem>
        <NavItem to="/" end>
          <Icon name="home" />
        </NavItem>
        <NavItem to="/post">
          <Icon name="event" />
        </NavItem>
        <NavItem to="/settings">
          <Icon name="settings" />
        </NavItem>
      </div>
      <div className={styles.desktop}>
        <div className={styles.holder}>
          <NavItem to="/" end>
            <Logo size="m" />
          </NavItem>
          <NavItem to="/map">
            <div>Heat Map</div>
          </NavItem>
          <NavItem to="/saved">
            <div>Saved Events</div>
          </NavItem>
          <NavItem to="/post">
            <div>Post Event</div>
          </NavItem>
        </div>
        <div className={styles.holder}>
          <TextInput icon="search" placeholder="Search this page"></TextInput>
          <Button icon="settings" onClick={onSettingsClick}></Button>
          {!signedIn && (
            <Button text="Sign In" onClick={onSignInClick}></Button>
          )}
          {signedIn && <div>Profile Button</div>}
        </div>
      </div>
    </div>
  );
}

export default NavBar;
