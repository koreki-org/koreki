import React from 'react';
import Head from 'next/head';
import AppLayout from './AppLayout';
import { AdminHeader } from '@/components/layout/AdminHeader';

interface AdminLayoutProps {
    children: React.ReactNode;
    title: string;
    headTitle?: string;
    subtitle?: string;
    institution?: string;
    backPath?: string;
    backLabel?: string;
    headerRight?: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({
    children,
    title,
    headTitle,
    subtitle,
    institution,
    backPath,
    backLabel,
    headerRight
}) => {
    return (
        <AppLayout showFooter={false}>
            <div className="max-w-[1500px] mx-auto p-4 md:p-8 relative z-10 animate-fade-in">
                <Head>
                    <title>{headTitle || `${title} | Koreki`}</title>
                </Head>

                <AdminHeader 
                    title={title}
                    subtitle={subtitle}
                    institution={institution}
                    backPath={backPath}
                    backLabel={backLabel}
                    rightContent={headerRight}
                />

                {children}
            </div>
        </AppLayout>
    );
};

export default AdminLayout;
