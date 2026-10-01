import { keepPreviousData, queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { calendarApi } from '@/api/client';
import { getMonthQueryRange } from '@/features/calendar/lib/calendar';

/** One request per displayed month (full weeks included); filters are applied locally. */
function calendarMonthQuery(dateInMonth: Date) {
  const range = getMonthQueryRange(dateInMonth);
  return queryOptions({
    queryKey: ['calendar', 'month', range.monthKey],
    queryFn: ({ signal }) =>
      calendarApi.list({ startDate: range.startDate, endDate: range.endDate }, signal),
    staleTime: 60_000,
  });
}

export function useCalendarMonth(dateInMonth: Date) {
  return useQuery({ ...calendarMonthQuery(dateInMonth), placeholderData: keepPreviousData });
}

export function usePrefetchCalendarMonth() {
  const queryClient = useQueryClient();
  return (dateInMonth: Date) => {
    void queryClient.prefetchQuery(calendarMonthQuery(dateInMonth));
  };
}
