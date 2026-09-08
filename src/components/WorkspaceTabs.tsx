import React from 'react';
import type { Page } from '../data';

export interface TabItem {
  id: Page;
  label: string;
  icon?: React.ElementType;
  badge?: string | number;
  badgeTone?: 'default' | 'amber' | 'red' | 'green' | 'teal';
  badgeVariant?: 'default' | 'warning' | 'danger' | 'success';
}

interface WorkspaceTabsProps {
  tabs: TabItem[];
  activeTab: Page;
  onSelectTab: (tabId: Page) => void;
}

export default function WorkspaceTabs({ tabs, activeTab, onSelectTab }: WorkspaceTabsProps) {
  return (
    <div className="workspace-tabs-bar" role="tablist">
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        const tone = tab.badgeTone || (tab.badgeVariant === 'danger' ? 'red' : tab.badgeVariant === 'warning' ? 'amber' : tab.badgeVariant === 'success' ? 'green' : 'default');
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            className={`workspace-tab-btn ${isActive ? 'active' : ''}`}
            onClick={() => onSelectTab(tab.id)}
          >
            {Icon && <Icon size={16} className="tab-icon" strokeWidth={isActive ? 2.2 : 1.8} />}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`workspace-tab-badge ${
                  tone === 'red'
                    ? 'badge-red'
                    : tone === 'amber'
                    ? 'badge-amber'
                    : tone === 'green'
                    ? 'badge-green'
                    : ''
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
