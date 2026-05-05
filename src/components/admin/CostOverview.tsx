import React from 'react';
import { DbUser, AppSettings } from '@/types';
import { GlobalBillingSettings } from '../settings/GlobalBillingSettings';
import { useAdminData } from '@/hooks/useAdminData';

interface CostOverviewProps {
    users: DbUser[];
    settings: AppSettings;
}

const CostOverview: React.FC<CostOverviewProps> = ({ users, settings }) => {
    const { saveSettings } = useAdminData();

    return (
        <div className="p-4 md:p-8">
            <GlobalBillingSettings 
                users={users} 
                settings={settings} 
                onSave={saveSettings} 
            />
        </div>
    );
};

export default CostOverview;

