/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useState, useEffect, useRef } from 'react';

export default function TopBar({ onShowExperimentalLab }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuRef]);


  return (
    <header className="top-bar">
      <div className="top-bar-controls">
        <div className="top-bar-menu-container" ref={menuRef}>
          <button className="iconButton" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <span className="icon">more_horiz</span>
            <span className="tooltip">More</span>
          </button>

          {isMenuOpen && (
            <div className="top-bar-menu">
                <ul>
                    <li className="top-bar-menu-item-button">
                        <button onClick={() => { onShowExperimentalLab(); setIsMenuOpen(false); }}>
                            <span className="icon">science</span>
                            <span>Experimental Lab</span>
                        </button>
                    </li>
                </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
