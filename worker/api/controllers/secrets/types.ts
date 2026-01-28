import { SecretTemplate } from '../../../types/secretsTemplates';
import { EncryptedSecret } from '../../../database/types';

export interface SecretTemplatesData {
	templates: SecretTemplate[];
}

export interface SecretsData {
	secrets: EncryptedSecret[];
}

export interface SecretStoreData {
	secret: EncryptedSecret;
	success: boolean;
	message?: string;
}

export interface SecretDeleteData {
	success: boolean;
	message?: string;
}
