import { Category } from '../types/category';
import { sheetsClient } from '../lib/http-client';
import { useAuthStore } from '../stores/authStore';
import { SHEET_NAMES } from '../constants/sheetNames';

const TAB_NAME = SHEET_NAMES.Categories;

export class CategoryRepository {
  private getSpreadsheetId(): string {
    const { spreadsheetId } = useAuthStore.getState();
    if (!spreadsheetId) throw new Error('No spreadsheet connected. Please sign in again.');
    return spreadsheetId;
  }

  async list(): Promise<Category[]> {
    const id = this.getSpreadsheetId();
    return await sheetsClient.getRows<Category>(id, `${TAB_NAME}!A:E`);
  }

  async getById(categoryId: string): Promise<Category | null> {
    const list = await this.list();
    return list.find(c => c.categoryId === categoryId) || null;
  }

  async create(data: { categoryId: string; name: string; color: string; icon: string }): Promise<Category> {
    const id = this.getSpreadsheetId();
    const newCategory: Category = {
      ...data,
      createdAt: new Date().toISOString(),
    };
    await sheetsClient.appendRow(id, TAB_NAME, newCategory);
    return newCategory;
  }
}

export const categoryRepository = new CategoryRepository();
