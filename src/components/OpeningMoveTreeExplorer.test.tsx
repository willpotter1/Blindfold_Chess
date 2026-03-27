// @vitest-environment jsdom

import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OpeningMoveTreeExplorer } from '@/components/OpeningMoveTreeExplorer';
import { OpeningSelectionBasket } from '@/components/OpeningSelectionBasket';
import { buildOpeningExplorerFixture } from '@/lib/openingExplorerTestUtils';
import type { OpeningSelection } from '@/lib/openingTrainer';

const { explorer } = buildOpeningExplorerFixture();

const Harness = () => {
  const [selections, setSelections] = useState<OpeningSelection[]>([]);

  return (
    <div className="h-[900px] w-[700px]">
      <OpeningMoveTreeExplorer
        explorer={explorer}
        playerColor="white"
        selections={selections}
        onSelectionsChange={setSelections}
      />
      <OpeningSelectionBasket
        explorer={explorer}
        playerColor="white"
        selections={selections}
        onRemoveSelection={(selectionId) => {
          setSelections((currentValue) => currentValue.filter((selection) => selection.id !== selectionId));
        }}
      />
    </div>
  );
};

const renderHarness = async () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  document.body.appendChild(container);

  await act(async () => {
    root.render(<Harness />);
  });

  return {
    container,
    root,
    cleanup: async () => {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const dispatchKeyboardEvent = async (element: Element, key: string) => {
  await act(async () => {
    element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });
};

const dispatchClick = async (element: Element | null) => {
  if (!element) {
    throw new Error('Missing target element for click.');
  }

  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const dispatchInput = async (input: HTMLInputElement, value: string) => {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;

  await act(async () => {
    valueSetter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
};

const getTreeItems = (container: HTMLElement) => (
  Array.from(container.querySelectorAll('[role="treeitem"]')) as HTMLDivElement[]
);

const findTreeItem = (container: HTMLElement, text: string) => {
  const treeItem = getTreeItems(container).find((element) => element.textContent?.includes(text));

  if (!treeItem) {
    throw new Error(`Missing tree item containing "${text}".`);
  }

  return treeItem;
};

beforeEach(() => {
  // React's tree jump handler uses scrollIntoView after focus changes.
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('OpeningMoveTreeExplorer', () => {
  it('supports keyboard navigation, expansion, and breadcrumb updates', async () => {
    const { container, cleanup } = await renderHarness();

    const firstTreeItem = container.querySelector('[role="treeitem"][tabindex="0"]') as HTMLDivElement | null;

    expect(firstTreeItem?.textContent).toContain('1. e4');

    await dispatchKeyboardEvent(firstTreeItem!, 'ArrowRight');
    expect(container.textContent).toContain('... e5 2. Nf3');
    expect(container.textContent).toContain('... e6 2. d4');
    expect(container.textContent).not.toContain('... e5Add branch');

    await dispatchKeyboardEvent(firstTreeItem!, 'ArrowRight');
    expect((document.activeElement as HTMLElement | null)?.textContent).toContain('... e5 2. Nf3');
    expect(container.textContent).toContain('1. e4 / ... e5 2. Nf3');

    await dispatchKeyboardEvent(document.activeElement as HTMLDivElement, 'ArrowRight');
    await dispatchKeyboardEvent(document.activeElement as HTMLDivElement, 'ArrowRight');
    expect(
      ['... Nc6 3. Bc4', '... Nc6 3. Bb5']
        .some((label) => (document.activeElement as HTMLElement | null)?.textContent?.includes(label)),
    ).toBe(true);
    expect(container.textContent).toContain('1. e4 / ... e5 2. Nf3 / ... Nc6 3.');

    await dispatchKeyboardEvent(document.activeElement as HTMLDivElement, 'ArrowLeft');
    expect((document.activeElement as HTMLElement | null)?.textContent).toContain('... e5 2. Nf3');

    await cleanup();
  });

  it('selects a branch with Space and marks descendants as covered', async () => {
    const { container, cleanup } = await renderHarness();

    const firstTreeItem = container.querySelector('[role="treeitem"][tabindex="0"]') as HTMLDivElement;
    await dispatchKeyboardEvent(firstTreeItem, ' ');

    expect(container.textContent).toContain('1 selected');
    expect(container.textContent).toContain('Branch selected');
    expect(container.textContent).toContain('1. e4');

    await dispatchClick(firstTreeItem.querySelector('button'));

    const coveredChild = findTreeItem(container, '... e5 2. Nf3');
    expect(coveredChild.textContent).toContain('Covered by ancestor');
    expect(coveredChild.textContent).toContain('Covered');

    await cleanup();
  });

  it('adds and removes named opening selections', async () => {
    const { container, cleanup } = await renderHarness();

    const firstTreeItem = container.querySelector('[role="treeitem"][tabindex="0"]') as HTMLDivElement;
    await dispatchClick(firstTreeItem.querySelector('button'));

    const frenchRow = findTreeItem(container, '... e6 2. d4');
    const addOpeningButton = Array.from(frenchRow.querySelectorAll('button')).find((button) => button.textContent === 'Add opening');

    await dispatchClick(addOpeningButton ?? null);

    expect(container.textContent).toContain('Named opening');
    expect(container.textContent).toContain('French Defense');

    const updatedFrenchRow = findTreeItem(container, '... e6 2. d4');
    const removeOpeningButton = Array.from(updatedFrenchRow.querySelectorAll('button')).find((button) => button.textContent === 'Remove opening');

    await dispatchClick(removeOpeningButton ?? null);

    expect(container.textContent).toContain('No branches selected yet.');

    await cleanup();
  });

  it('jumps from search results into the expanded tree', async () => {
    const { container, cleanup } = await renderHarness();

    const searchInput = container.querySelector('input#opening-tree-search') as HTMLInputElement;
    await dispatchInput(searchInput, 'French');

    const searchResult = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('French Defense'));

    await dispatchClick(searchResult ?? null);

    expect(container.textContent).toContain('1. e4 / ... e6 2. d4');
    expect((document.activeElement as HTMLElement | null)?.textContent).toContain('French Defense');

    await cleanup();
  });
});
