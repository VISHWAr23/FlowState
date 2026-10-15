import { SettingsView } from '@/components/settings';

export const metadata = {
  title: 'Profile | FlowState',
  description: 'View and manage your FlowState profile and account settings',
};

export default function ProfilePage() {
  return <SettingsView defaultTab="profile" />;
}
