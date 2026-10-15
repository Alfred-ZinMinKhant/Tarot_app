import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useLanguage } from '@/hooks/useLanguage';
import { useSettings } from '@/store/settings';
import { syncAvailable, syncMethods, useSync } from '@/store/sync';
import { useToast } from '@/store/toast';
import { spacing } from '@/theme/spacing';
import { formatDate } from '@/utils/dates';
import { toLatinDigits } from '@/utils/numbers';

import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Card } from './Card';
import { TextField } from './TextField';

/** Settings → Cloud backup. Rendered only in builds with cloud backup configured. */
export function CloudSyncCard() {
  const { t } = useTranslation();
  const lang = useLanguage();
  const toast = useToast((s) => s.show);
  const burmeseNumerals = useSettings((s) => s.burmeseNumerals);
  const sync = useSync();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!syncAvailable()) return null;

  const run = async (task: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await task();
    } finally {
      setBusy(false);
    }
  };

  const error = sync.error ? (
    <AppText tone="danger" accessibilityLiveRegion="polite" testID="sync-error">
      {t(`sync.errors.${sync.error}`)}
    </AppText>
  ) : null;

  let body;
  if (sync.status === 'signedOut') {
    const { providers, email: emailEnabled } = syncMethods();
    body = (
      <>
        {providers.map((provider) => (
          <Button
            key={provider}
            label={t(`sync.continue.${provider}`)}
            onPress={() => run(() => sync.signInWithProvider(provider))}
            loading={busy}
            testID={`sync-${provider}`}
          />
        ))}
        {providers.length > 0 && emailEnabled ? (
          <AppText variant="caption" tone="textMuted" testID="sync-or">
            {t('sync.or')}
          </AppText>
        ) : null}
        {emailEnabled ? (
          <>
            <TextField
              label={t('sync.emailLabel')}
              value={email}
              onChangeText={setEmail}
              placeholder={t('sync.emailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              testID="sync-email"
            />
            <Button
              label={t('sync.sendCode')}
              onPress={() => run(() => sync.sendCode(email))}
              loading={busy}
              disabled={!email.trim()}
              testID="sync-send-code"
            />
          </>
        ) : null}
        {error}
      </>
    );
  } else if (sync.status === 'codeSent') {
    body = (
      <>
        <AppText>{t('sync.codeSent', { email: sync.email })}</AppText>
        <TextField
          label={t('sync.codeLabel')}
          value={code}
          onChangeText={(v) => setCode(toLatinDigits(v).replace(/\D/g, ''))}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={8}
          testID="sync-code"
        />
        {error}
        <Button
          label={t('sync.verify')}
          onPress={() =>
            run(async () => {
              if (await sync.verifyCode(code)) toast(t('sync.signedIn'));
            })
          }
          loading={busy}
          disabled={code.length < 6}
          testID="sync-verify"
        />
        <Button
          label={t('sync.useDifferentEmail')}
          variant="ghost"
          onPress={sync.cancelCode}
          testID="sync-cancel-code"
        />
      </>
    );
  } else {
    const last = sync.lastSyncedAt
      ? t('sync.lastSynced', {
          time: formatDate(new Date(sync.lastSyncedAt), lang, {
            style: 'short',
            burmeseNumerals,
            withTime: true,
          }),
        })
      : t('sync.never');
    body = (
      <>
        <AppText bold testID="sync-account">
          {t('sync.signedInAs', { email: sync.email })}
        </AppText>
        <AppText variant="caption" tone="textMuted" testID="sync-last">
          {sync.status === 'syncing' ? t('sync.syncing') : last}
        </AppText>
        {error}
        <Button
          label={t('sync.syncNow')}
          variant="secondary"
          onPress={() => sync.syncNow()}
          loading={sync.status === 'syncing'}
          testID="sync-now"
        />
        <Button
          label={t('sync.signOut')}
          variant="ghost"
          onPress={() => sync.signOut()}
          testID="sync-sign-out"
        />
        <Button
          label={t('sync.deleteAccount')}
          variant="ghost"
          onPress={() => setConfirmDelete(true)}
          testID="sync-delete-account"
        />
      </>
    );
  }

  return (
    <Card testID="sync-card">
      <AppText variant="heading">{t('sync.title')}</AppText>
      <AppText variant="caption" tone="textMuted">
        {t('sync.intro')}
      </AppText>
      <View style={styles.body}>{body}</View>
      <BottomSheet
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t('sync.deleteTitle')}
        closeLabel={t('common.cancel')}
        testID="sync-delete-sheet"
      >
        <AppText>{t('sync.deleteBody')}</AppText>
        <Button
          label={t('sync.deleteConfirm')}
          loading={busy}
          onPress={() =>
            run(async () => {
              const ok = await sync.deleteCloudAccount();
              setConfirmDelete(false);
              if (ok) toast(t('sync.deleted'));
            })
          }
          testID="sync-delete-confirm"
        />
        <Button
          label={t('common.cancel')}
          variant="ghost"
          onPress={() => setConfirmDelete(false)}
        />
      </BottomSheet>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.sm },
});
