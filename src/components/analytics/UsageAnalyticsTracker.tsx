import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import settingsApi from '../../api/settings';
import type { UsageAnalyticsEventPayload } from '../../types/settings';

type UsageAnalyticsTrackerProps = {
  labelMap: Map<string, string>;
  moduleMap?: Map<string, string>;
};

const SESSION_KEY = 'usage-analytics-session-id';
const MIN_LEAVE_DURATION_SECONDS = 3;
const PAGE_VIEW_DEDUP_MS = 1000;

let lastPageView: { pagePath: string; sentAt: number } | null = null;

const getSessionId = () => {
  const existing = window.sessionStorage.getItem(SESSION_KEY);
  if (existing) {
    return existing;
  }
  const next =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.sessionStorage.setItem(SESSION_KEY, next);
  return next;
};

const normalizeText = (value?: string | null) => {
  if (!value) {
    return '';
  }
  return value.replace(/\s+/g, ' ').trim();
};

const findPageLabel = (labelMap: Map<string, string>, pathname: string) => {
  const candidates = Array.from(labelMap.entries())
    .filter(([path]) => pathname === path || pathname.startsWith(`${path}/`))
    .sort((a, b) => b[0].length - a[0].length);
  return candidates[0]?.[1] ?? document.title ?? pathname;
};

const findModuleLabel = (labelMap: Map<string, string>, pathname: string, moduleMap?: Map<string, string>) => {
  if (moduleMap) {
    const candidates = Array.from(moduleMap.entries())
      .filter(([path]) => pathname === path || pathname.startsWith(`${path}/`))
      .sort((a, b) => b[0].length - a[0].length);
    if (candidates[0]?.[1]) {
      return candidates[0][1];
    }
  }
  const [, firstSegment] = pathname.split('/');
  if (!firstSegment) {
    return '工作台';
  }
  if (firstSegment === 'dashboard') {
    return labelMap.get('/dashboard/workplace') ?? '工作台';
  }
  return labelMap.get(`/${firstSegment}`) ?? firstSegment;
};

const buildEventKey = (pagePath: string, label: string) => {
  const normalized = `${pagePath}:${label}`
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5:/_-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 160);
  return normalized || pagePath;
};

const resolveTrackableElement = (target: EventTarget | null): HTMLElement | null => {
  if (!(target instanceof HTMLElement)) {
    return null;
  }
  return target.closest<HTMLElement>('button,[role="button"],a.ant-dropdown-trigger,.ant-dropdown-menu-item');
};

const resolveElementLabel = (element: HTMLElement) => {
  const dataset = element.dataset;
  const label =
    dataset.trackName ||
    element.getAttribute('aria-label') ||
    element.getAttribute('title') ||
    element.innerText ||
    element.textContent;
  return normalizeText(label).slice(0, 80);
};

const shouldSkipClick = (element: HTMLElement, label: string) => {
  if (!label) {
    return true;
  }
  if (element.closest('[data-track-ignore="true"]')) {
    return true;
  }
  return label.length > 80;
};

const sendAnalyticsEvent = (payload: UsageAnalyticsEventPayload) => {
  void settingsApi.analytics.record(payload).catch(() => {
    // 使用统计不能影响业务操作。
  });
};

const UsageAnalyticsTracker = ({ labelMap, moduleMap }: UsageAnalyticsTrackerProps) => {
  const location = useLocation();
  const sessionId = useMemo(getSessionId, []);

  useEffect(() => {
    const pagePath = location.pathname;
    const pageTitle = findPageLabel(labelMap, pagePath);
    const pageModule = findModuleLabel(labelMap, pagePath, moduleMap);
    const enteredAt = Date.now();
    const now = Date.now();
    const shouldSendPageView =
      !lastPageView ||
      lastPageView.pagePath !== pagePath ||
      now - lastPageView.sentAt > PAGE_VIEW_DEDUP_MS;

    if (shouldSendPageView) {
      lastPageView = { pagePath, sentAt: now };
      sendAnalyticsEvent({
        eventType: 'PAGE_VIEW',
        pagePath,
        pageTitle,
        pageModule,
        sessionId,
        occurredAt: new Date().toISOString(),
      });
    }

    return () => {
      const durationSeconds = Math.round((Date.now() - enteredAt) / 1000);
      if (durationSeconds < MIN_LEAVE_DURATION_SECONDS) {
        return;
      }
      sendAnalyticsEvent({
        eventType: 'PAGE_LEAVE',
        pagePath,
        pageTitle,
        pageModule,
        durationSeconds,
        sessionId,
        occurredAt: new Date().toISOString(),
      });
    };
  }, [labelMap, location.pathname, moduleMap, sessionId]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const element = resolveTrackableElement(event.target);
      if (!element) {
        return;
      }
      const label = resolveElementLabel(element);
      if (shouldSkipClick(element, label)) {
        return;
      }
      const pagePath = window.location.pathname;
      sendAnalyticsEvent({
        eventType: 'BUTTON_CLICK',
        pagePath,
        pageTitle: findPageLabel(labelMap, pagePath),
        pageModule: findModuleLabel(labelMap, pagePath, moduleMap),
        eventName: label,
        eventLabel: label,
        eventKey: buildEventKey(pagePath, label),
        sessionId,
        occurredAt: new Date().toISOString(),
      });
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [labelMap, moduleMap, sessionId]);

  return null;
};

export default UsageAnalyticsTracker;
