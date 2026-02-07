<script setup lang="ts">
import { h, resolveComponent } from "vue";
import type { TableColumn } from "@nuxt/ui";

useSeoMeta({ title: "Overview" });

const UBadge = resolveComponent("UBadge");

const { data: data_overview, status: status_overview } =
  useFetch("/api/overview");
const { data: data_usage, status: status_usage } =
  useFetch<UsageData>("/api/usage");

const list_usage_stats = computed(() => {
  if (!data_usage.value) return [];
  const { tokens, count_sessions, count_messages } = data_usage.value;
  return [
    {
      key: "input",
      label: "Input Tokens",
      value: formatCompact(tokens.input),
      icon: "lucide:arrow-down-to-line",
    },
    {
      key: "output",
      label: "Output Tokens",
      value: formatCompact(tokens.output),
      icon: "lucide:arrow-up-from-line",
    },
    {
      key: "sessions",
      label: "Sessions",
      value: formatCompact(count_sessions),
      icon: "lucide:layers",
    },
    {
      key: "messages",
      label: "API Calls",
      value: formatCompact(count_messages),
      icon: "lucide:message-square",
    },
  ];
});

const list_overview_stats = computed(() => {
  if (!data_overview.value) return [];
  const counts = data_overview.value.counts;
  const map: { key: string; label: string; icon: string }[] = [
    { key: "skills", label: "Skills", icon: "i-lucide-zap" },
    { key: "agents", label: "Agents", icon: "i-lucide-bot" },
    { key: "rules", label: "Rules", icon: "i-lucide-scale" },
    { key: "hooks", label: "Hooks", icon: "i-lucide-webhook" },
    { key: "commands", label: "Commands", icon: "i-lucide-terminal" },
    { key: "sessions", label: "Sessions", icon: "i-lucide-clock" },
    { key: "plans", label: "Plans", icon: "i-lucide-map" },
    { key: "teams", label: "Teams", icon: "i-lucide-users" },
  ];
  return map.map((m) => ({
    ...m,
    count: counts[m.key] ?? 0,
  }));
});

type RecentFile = { name_file: string; dir: string; time_modified: string };

const columns_recent: TableColumn<RecentFile>[] = [
  { accessorKey: "name_file", header: "File" },
  {
    accessorKey: "dir",
    header: "Category",
    cell: ({ row }) =>
      h(
        UBadge,
        { color: "neutral", variant: "subtle", size: "sm" },
        () => row.original.dir,
      ),
  },
  {
    accessorKey: "time_modified",
    header: "Modified",
    cell: ({ row }) =>
      new Date(row.original.time_modified).toLocaleString("en-US"),
  },
];
</script>

<template>
  <UDashboardPanel id="overview">
    <template #header>
      <UDashboardNavbar title="Overview">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 space-y-6">
        <!-- Usage Stats -->
        <div
          v-if="status_usage === 'pending'"
          class="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <USkeleton v-for="i in 4" :key="i" class="h-24" />
        </div>
        <div
          v-else-if="data_usage"
          class="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <UCard v-for="item in list_usage_stats" :key="item.key">
            <div class="flex items-center gap-3">
              <div
                class="flex items-center justify-center size-10 rounded-lg bg-primary/10"
              >
                <UIcon :name="item.icon" class="size-5 text-primary" />
              </div>
              <div>
                <p class="text-sm text-dimmed">{{ item.label }}</p>
                <p class="text-2xl font-bold tabular-nums">{{ item.value }}</p>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Usage Chart -->
        <UCard v-if="data_usage?.list_daily?.length">
          <template #header>
            <h3 class="text-sm font-medium text-dimmed">
              Daily Token Usage (Last 30 Days)
            </h3>
          </template>
          <UsageChart :data="data_usage.list_daily" />
        </UCard>
        <USkeleton v-else-if="status_usage === 'pending'" class="h-[340px]" />

        <!-- Overview Stats -->
        <div
          v-if="status_overview === 'pending'"
          class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          <USkeleton v-for="i in 8" :key="i" class="h-20" />
        </div>
        <div
          v-else
          class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          <StatCard
            v-for="item in list_overview_stats"
            :key="item.key"
            :label="item.label"
            :count="item.count"
            :icon="item.icon"
          />
        </div>

        <!-- Recent Files -->
        <UCard>
          <template #header>
            <h3 class="text-sm font-medium text-dimmed">Recent Files</h3>
          </template>

          <div v-if="status_overview === 'pending'">
            <USkeleton v-for="i in 5" :key="i" class="h-8 mb-2" />
          </div>
          <UTable
            v-else-if="data_overview?.list_recent?.length"
            :data="data_overview.list_recent"
            :columns="columns_recent"
          />
          <div v-else class="text-sm text-dimmed">No recent files found.</div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
