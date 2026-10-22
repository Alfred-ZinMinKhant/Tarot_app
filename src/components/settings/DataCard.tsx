import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText, BottomSheet, Button, Card } from '@/components';
import { shareJsonFile } from '@/services/exportFile';
import { ImportError, importBackup } from '@/services/importData';
import { pickBackupFile } from '@/services/pickBackup';
import { buildExport, deleteAllUserData, exportFileName } from '@/services/userData';
import { useSettings } from '@/store/settings';
import { useSync } from '@/store/sync';
import { useToast } from '@/store/toast';
import { logError } from '@/utils/log';
import { formatNumber } from '@/utils/numbers';

/** Export, restore and delete-everything, including the delete confirmation sheet. */
export function DataCard() {
  const { t } = useTranslation();
  const burmeseNumerals = useSettings((x) => x.burmeseNumerals);
  const toast = useToast((x) => x.show);
  const signedIntoCloud = useSync((x) => x.status !== 'signedOut' && x.status !== 'codeSent');
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const exportData = async () => {
    setExporting(true);
    const data = await buildExport();
    const result = await shareJsonFile(exportFileName(), JSON.stringify(data, null, 2), t('settings.exportDialog'));
    setExporting(false);
    if (result === 'failed') toast(t('settings.exportFailed'));
    else if (result === 'unavailable') toast(t('share.unavailable'));
  };

  const restoreData = async () => {
    setImporting(true);
    try {
      const json = await pickBackupFile();
      if (json === null) return;
      const { added } = await importBackup(json);
      toast(added > 0 ? t('settings.importDone', { n: formatNumber(added, { burmeseNumerals }) }) : t('settings.importNothing'));
    } catch (e) {
      logError('settings.import', e);
      const code = e instanceof ImportError ? e.code : null;
      const key =
        code === 'notBackup' || code === 'notJson'
          ? 'importInvalid'
          : code === 'newerVersion'
            ? 'importNewer'
            : code === 'tooBig'
              ? 'importTooBig'
              : 'importFailed';
      toast(t(`settings.${key}`));
    } finally {
      setImporting(false);
    }
  };

  const deleteData = async () => {
    setConfirmDelete(false);
    await deleteAllUserData();
    toast(t('settings.deletedData'));
    router.replace('/welcome');
  };

  return (
    <>
      <Card>
        <AppText variant="heading">{t('settings.data')}</AppText>
        <AppText variant="caption" tone="textMuted">
          {t('settings.dataHint')}
        </AppText>
        <Button
          label={t('settings.export')}
          variant="secondary"
          onPress={exportData}
          loading={exporting}
          testID="settings-export"
        />
        <Button
          label={t('settings.import')}
          variant="secondary"
          onPress={restoreData}
          loading={importing}
          testID="settings-import"
        />
        <AppText variant="caption" tone="textMuted">
          {t('settings.importHint')}
        </AppText>
        <Button
          label={t('settings.deleteData')}
          variant="ghost"
          onPress={() => setConfirmDelete(true)}
          testID="settings-delete-data"
        />
      </Card>

      <BottomSheet
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t('settings.deleteDataTitle')}
        closeLabel={t('common.cancel')}
        testID="delete-data-sheet"
      >
        <AppText>{t('settings.deleteDataBody')}</AppText>
        {signedIntoCloud ? <AppText variant="caption">{t('settings.deleteDataCloud')}</AppText> : null}
        <Button label={t('settings.deleteDataConfirm')} onPress={deleteData} testID="delete-data-confirm" />
        <Button label={t('common.cancel')} variant="ghost" onPress={() => setConfirmDelete(false)} />
      </BottomSheet>
    </>
  );
}
