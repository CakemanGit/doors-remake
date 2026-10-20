import { useEffect, useState, type MouseEvent } from 'react'
import { useGame } from '../context/useGame'
import type { ItemType } from '../context/GameContextStore'
import './GameHUD.css'

const ITEM_LABELS: Record<ItemType, string> = {
  key: 'Key',
  flashlight: 'Flashlight',
  vitamins: 'Vitamins',
}

const ITEM_SHORT_LABELS: Record<ItemType, string> = {
  key: 'KEY',
  flashlight: 'LIGHT',
  vitamins: 'VIT',
}

const ITEM_ICONS: Record<ItemType, string> = {
  key: '⚿',
  flashlight: '▰',
  vitamins: '+',
}

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT')
  )
}

export default function GameHUD() {
  const {
    gameState,
    currentRoomId,
    inventory,
    equippedSlot,
    batteryLevel,
    flashlightOn,
    speedMultiplier,
    selectSlot,
    activateItem,
    startGame,
    returnToMenu,
  } = useGame()
  const [creditsOpen, setCreditsOpen] = useState(false)

  useEffect(() => {
    if (gameState !== 'PLAYING' && document.pointerLockElement) {
      document.exitPointerLock()
    }
  }, [gameState])

  useEffect(() => {
    if (gameState !== 'PLAYING') return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return

      if (event.key >= '1' && event.key <= '3') {
        selectSlot(Number(event.key) - 1)
      } else if (event.key.toLowerCase() === 'f' && !event.repeat) {
        activateItem()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activateItem, gameState, selectSlot])

  const beginGame = () => {
    startGame()
    const canvas = document.querySelector('canvas')
    if (canvas) void canvas.requestPointerLock().catch(() => undefined)
  }

  const handleInventorySlotClick = (
    index: number,
    event: MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault()
    event.stopPropagation()
    if (gameState !== 'PLAYING') return

    const item = inventory[index]
    selectSlot(index)
    if (item === 'flashlight' || item === 'vitamins') {
      activateItem(index)
    }
  }

  if (gameState === 'MENU') {
    return (
      <div className="game-menu" role="dialog" aria-modal="true">
        <div className="game-menu__panel">
          {creditsOpen ? (
            <>
              <span className="game-menu__eyebrow">THE PEOPLE BEHIND THE HOTEL</span>
              <h1 className="game-menu__title">CREDITS</h1>
              <div className="game-menu__credits">
                <p>Game developed by: CakemanHD</p>
                <p>YouTube: @cakemanhd</p>
                <p>TikTok: @cakemanhdofficial</p>
                <p>Github: CakemanGit</p>
                <p>itch.io: CakemanHD</p>
                <p>Powered with R3F Library and Three.js</p>
                <p>Version: 1.0.0 TypeScript</p>
                <p>Special Thanks to: You! (Thank you for playing!)</p>
              </div>
              <button
                className="game-menu__button game-menu__button--secondary"
                type="button"
                onClick={() => setCreditsOpen(false)}
              >
                BACK
              </button>
            </>
          ) : (
            <>
              <span className="game-menu__eyebrow">YOUR STAY BEGINS HERE</span>
              <h1 className="game-menu__title">THE HOTEL</h1>
              <p className="game-menu__subtitle">Some doors should stay closed.</p>
              <div className="game-menu__actions">
                <button
                  className="game-menu__button"
                  type="button"
                  onClick={beginGame}
                >
                  PLAY
                </button>
                <button
                  className="game-menu__button game-menu__button--secondary"
                  type="button"
                  onClick={() => setCreditsOpen(true)}
                >
                  CREDITS
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  if (gameState === 'GAMEOVER') {
    return (
      <div className="game-hud__game-over" role="alertdialog" aria-modal="true">
        <span>YOU WERE CAUGHT</span>
        <strong>GAME OVER</strong>
        <button
          className="game-menu__button"
          type="button"
          onClick={returnToMenu}
        >
          MAIN MENU
        </button>
      </div>
    )
  }

  return (
    <aside className="game-hud" aria-label="Game status">
      <div className="game-hud__room">
        <span className="game-hud__eyebrow">CURRENT ROOM</span>
        <strong>{String(currentRoomId).padStart(2, '0')}</strong>
      </div>

      <div className="game-hud__inventory" aria-label="Inventory">
        {inventory.map((item, index) => {
          const selected = equippedSlot === index

          return (
            <button
              className={`game-hud__slot${selected ? ' is-selected' : ''}`}
              key={index}
              type="button"
              aria-label={
                item
                  ? `Slot ${index + 1}: ${ITEM_LABELS[item]}${selected ? ', selected' : ''}`
                  : `Slot ${index + 1}: empty`
              }
              aria-pressed={selected}
              onClick={(event) => handleInventorySlotClick(index, event)}
            >
              <span className="game-hud__slot-number">{index + 1}</span>
              <span className="game-hud__item-icon" aria-hidden="true">
                {item ? ITEM_ICONS[item] : ''}
              </span>
              <span className="game-hud__item-name">
                {item ? ITEM_SHORT_LABELS[item] : 'EMPTY'}
              </span>
              {item === 'flashlight' && flashlightOn && (
                <span className="game-hud__active-indicator">ON</span>
              )}
            </button>
          )
        })}
      </div>

      <div className="game-hud__status">
        <div className="game-hud__battery-copy">
          <span>BATTERY</span>
          <strong>{Math.round(batteryLevel)}%</strong>
        </div>
        <div
          className="game-hud__battery-track"
          role="meter"
          aria-label="Flashlight battery"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(batteryLevel)}
        >
          <span
            className={`game-hud__battery-fill${batteryLevel <= 20 ? ' is-low' : ''}`}
            style={{ width: `${batteryLevel}%` }}
          />
        </div>
        <span className="game-hud__mode">
          {flashlightOn ? 'FLASHLIGHT ON' : 'FLASHLIGHT OFF'}
          {speedMultiplier > 1 && ' · SPEED BOOST'}
        </span>
      </div>

      <span className="game-hud__hint">1–3 EQUIP · F USE · E INTERACT</span>
    </aside>
  )
}
