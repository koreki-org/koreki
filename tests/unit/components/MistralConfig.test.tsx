import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MistralConfig } from '../../../src/components/settings/MistralConfig';
import { vaultService } from '../../../src/lib/ai/vault-service';
import * as envContext from '../../../src/lib/env-context';

// Mock Dependencies
jest.mock('../../../src/lib/ai/vault-service', () => ({
    vaultService: {
        saveSecret: jest.fn(),
        getSecret: jest.fn(),
        deleteSecret: jest.fn()
    }
}));

jest.mock('../../../src/lib/env-context', () => ({
    getKorekiMode: jest.fn()
}));

describe('MistralConfig (Layer 2 - Vault Integration)', () => {
    const mockOnSave = jest.fn();
    const settings = { mistralKey: '' };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should call vaultService when saving a key in Desktop mode', async () => {
        (envContext.getKorekiMode as jest.Mock).mockReturnValue('desktop');
        
        render(<MistralConfig settings={settings} onSave={mockOnSave} appMode="PURE" />);
        
        const input = screen.getByPlaceholderText('sk-...');
        fireEvent.change(input, { target: { value: 'industrial-test-key-without-prefix' } });
        
        const saveButton = screen.getByText(/Speichern/i);
        fireEvent.click(saveButton);
        
        await waitFor(() => {
            expect(vaultService.saveSecret).toHaveBeenCalledWith('koreki-mistral-key', 'industrial-test-key-without-prefix');
        });
    });

    it('should NOT save to vault if key is too short (Validation)', async () => {
        (envContext.getKorekiMode as jest.Mock).mockReturnValue('desktop');
        
        render(<MistralConfig settings={settings} onSave={mockOnSave} appMode="PURE" />);
        
        const input = screen.getByPlaceholderText('sk-...');
        fireEvent.change(input, { target: { value: 'too-short' } });
        
        await waitFor(() => {
            expect(vaultService.saveSecret).not.toHaveBeenCalled();
        });
    });
});
