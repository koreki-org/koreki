import React from 'react';
import AVVUploadModal from '@/components/AVVUploadModal';
import { WorkspaceInfo } from '@/hooks/useOrgManagement';

interface OrgModalsProps {
    workspace: WorkspaceInfo | null;
    showAvvModal: boolean;
    setShowAvvModal: (show: boolean) => void;
    onComplete: () => void;
    onCancel: () => void;
}

export const OrgModals: React.FC<OrgModalsProps> = ({ 
    workspace, 
    showAvvModal, 
    setShowAvvModal, 
    onComplete, 
    onCancel 
}) => {
    if (!showAvvModal || !workspace) return null;

    return (
        <AVVUploadModal 
            isOrganization={true}
            workspaceId={workspace.id}
            organizationName={workspace.name}
            onComplete={() => {
                setShowAvvModal(false);
                onComplete();
            }}
            onCancel={onCancel}
        />
    );
};
