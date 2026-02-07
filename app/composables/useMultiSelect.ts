export function useMultiSelect() {
	const set_selected = ref(new Set<string>())

	function toggleItem(key: string): void {
		const next = new Set(set_selected.value)
		if (next.has(key)) next.delete(key)
		else next.add(key)
		set_selected.value = next
	}

	function selectAll(keys: string[]): void {
		set_selected.value = new Set(keys)
	}

	function clearAll(): void {
		set_selected.value = new Set()
	}

	function isAllSelected(total: number): boolean {
		return total > 0 && set_selected.value.size === total
	}

	return { set_selected, toggleItem, selectAll, clearAll, isAllSelected }
}
