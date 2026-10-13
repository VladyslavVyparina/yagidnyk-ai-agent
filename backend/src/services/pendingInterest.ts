import { prisma } from "../db/prisma";
import { sendTextToContact } from "../messaging/outbound";

export async function savePendingInterest(contactId: string, productName: string, note?: string) {
  return prisma.pendingInterest.create({
    data: { contactId, productName, note },
  });
}

/**
 * Викликається після синхронізації прайсу з Google Таблиці: перевіряє, чи зʼявились у прайсі
 * товари, на які клієнти чекали, і надсилає їм нагадування.
 */
export async function notifyClientsAboutAvailableProducts() {
  const pending = await prisma.pendingInterest.findMany({
    where: { notified: false },
    include: { contact: true },
  });

  if (pending.length === 0) return;

  const products = await prisma.product.findMany({ where: { isAvailable: true } });
  const availableNames = new Set(products.map((p) => p.name.toLowerCase().trim()));

  for (const item of pending) {
    const matches = [...availableNames].some(
      (name) => name.includes(item.productName.toLowerCase().trim()) || item.productName.toLowerCase().trim().includes(name)
    );
    if (!matches) continue;

    const text = `Доброго дня! Ви цікавились прийомом "${item.productName}" — тепер ми приймаємо цю позицію. Якщо ще актуально, напишіть, будь ласка, орієнтовний обʼєм і я підкажу умови.`;

    try {
      await sendTextToContact(item.contactId, text);
      await prisma.pendingInterest.update({
        where: { id: item.id },
        data: { notified: true, notifiedAt: new Date() },
      });
    } catch (err) {
      console.error(`[pendingInterest] Не вдалося надіслати нагадування контакту ${item.contactId}:`, err);
    }
  }
}
