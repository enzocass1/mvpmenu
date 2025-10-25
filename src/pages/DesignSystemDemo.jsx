import React, { useState } from 'react'
import {
  Button,
  Card,
  Input,
  Select,
  Badge,
  Modal,
  Spinner,
  EmptyState,
  Tabs,
  Toast,
  KPICard,
} from '../components/ui'
import { tokens } from '../styles/tokens'

/**
 * Design System Demo Page
 * Testing page for all UI components
 * Access at /#/design-system-demo
 */
function DesignSystemDemo() {
  const [showModal, setShowModal] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastType, setToastType] = useState('success')
  const [activeTab, setActiveTab] = useState('buttons')
  const [inputValue, setInputValue] = useState('')
  const [selectValue, setSelectValue] = useState('')

  const containerStyles = {
    minHeight: '100vh',
    backgroundColor: tokens.colors.gray[50],
    padding: tokens.spacing.xl,
  }

  const headerStyles = {
    marginBottom: tokens.spacing['2xl'],
    paddingBottom: tokens.spacing.xl,
    borderBottom: `${tokens.borders.width.thin} solid ${tokens.colors.gray[200]}`,
  }

  const titleStyles = {
    margin: 0,
    fontSize: tokens.typography.fontSize['4xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.black,
    marginBottom: tokens.spacing.sm,
  }

  const subtitleStyles = {
    margin: 0,
    fontSize: tokens.typography.fontSize.lg,
    color: tokens.colors.gray[600],
  }

  const sectionStyles = {
    marginBottom: tokens.spacing['3xl'],
  }

  const sectionTitleStyles = {
    fontSize: tokens.typography.fontSize['2xl'],
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.black,
    marginBottom: tokens.spacing.lg,
  }

  const gridStyles = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: tokens.spacing.md,
    marginBottom: tokens.spacing.xl,
  }

  const tabs = [
    { label: 'Buttons', value: 'buttons' },
    { label: 'Forms', value: 'forms' },
    { label: 'Cards', value: 'cards' },
    { label: 'Feedback', value: 'feedback' },
  ]

  return (
    <div style={containerStyles}>
      {/* Header */}
      <div style={headerStyles}>
        <h1 style={titleStyles}>Design System Demo</h1>
        <p style={subtitleStyles}>Shopify-like components - Clean minimal aesthetic</p>
      </div>

      {/* Tabs Navigation */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div style={{ marginTop: tokens.spacing['2xl'] }}>
        {/* BUTTONS TAB */}
        {activeTab === 'buttons' && (
          <>
            <div style={sectionStyles}>
              <h2 style={sectionTitleStyles}>Buttons</h2>

              <h3 style={{ fontSize: tokens.typography.fontSize.lg, marginBottom: tokens.spacing.md }}>
                Variants
              </h3>
              <div style={{ display: 'flex', gap: tokens.spacing.md, flexWrap: 'wrap', marginBottom: tokens.spacing.xl }}>
                <Button variant="primary">Primary Button</Button>
                <Button variant="secondary">Secondary Button</Button>
                <Button variant="outline">Outline Button</Button>
                <Button variant="ghost">Ghost Button</Button>
                <Button variant="danger">Danger Button</Button>
              </div>

              <h3 style={{ fontSize: tokens.typography.fontSize.lg, marginBottom: tokens.spacing.md }}>
                Sizes
              </h3>
              <div style={{ display: 'flex', gap: tokens.spacing.md, alignItems: 'center', flexWrap: 'wrap', marginBottom: tokens.spacing.xl }}>
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </div>

              <h3 style={{ fontSize: tokens.typography.fontSize.lg, marginBottom: tokens.spacing.md }}>
                States
              </h3>
              <div style={{ display: 'flex', gap: tokens.spacing.md, flexWrap: 'wrap' }}>
                <Button disabled>Disabled</Button>
                <Button loading>Loading</Button>
                <Button fullWidth>Full Width Button</Button>
              </div>
            </div>

            <div style={sectionStyles}>
              <h2 style={sectionTitleStyles}>Badges</h2>
              <div style={{ display: 'flex', gap: tokens.spacing.md, flexWrap: 'wrap' }}>
                <Badge variant="default">Default</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="error">Error</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="info">Info</Badge>
                <Badge variant="premium">Premium</Badge>
              </div>
            </div>
          </>
        )}

        {/* FORMS TAB */}
        {activeTab === 'forms' && (
          <>
            <div style={sectionStyles}>
              <h2 style={sectionTitleStyles}>Inputs</h2>
              <div style={{ maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg }}>
                <Input
                  label="Name"
                  placeholder="Enter your name"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
                <Input
                  label="Email"
                  type="email"
                  placeholder="your@email.com"
                  required
                />
                <Input
                  label="Password"
                  type="password"
                  helperText="Must be at least 8 characters"
                />
                <Input
                  label="Error State"
                  error="This field is required"
                />
                <Input
                  label="Disabled"
                  disabled
                  value="Disabled input"
                />
              </div>
            </div>

            <div style={sectionStyles}>
              <h2 style={sectionTitleStyles}>Select</h2>
              <div style={{ maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg }}>
                <Select
                  label="Country"
                  placeholder="Select a country"
                  value={selectValue}
                  onChange={(e) => setSelectValue(e.target.value)}
                  options={[
                    { value: 'it', label: 'Italy' },
                    { value: 'us', label: 'United States' },
                    { value: 'uk', label: 'United Kingdom' },
                  ]}
                />
                <Select
                  label="With Error"
                  error="Please select an option"
                  options={[
                    { value: '1', label: 'Option 1' },
                    { value: '2', label: 'Option 2' },
                  ]}
                />
              </div>
            </div>
          </>
        )}

        {/* CARDS TAB */}
        {activeTab === 'cards' && (
          <>
            <div style={sectionStyles}>
              <h2 style={sectionTitleStyles}>Cards</h2>
              <div style={gridStyles}>
                <Card variant="default">
                  <Card.Title>Default Card</Card.Title>
                  <Card.Description>
                    This is a default card with standard styling.
                  </Card.Description>
                </Card>

                <Card variant="outlined">
                  <Card.Title>Outlined Card</Card.Title>
                  <Card.Description>
                    This card has a more prominent border.
                  </Card.Description>
                </Card>

                <Card variant="elevated">
                  <Card.Title>Elevated Card</Card.Title>
                  <Card.Description>
                    This card has a shadow for elevation.
                  </Card.Description>
                </Card>
              </div>

              <Card variant="default">
                <Card.Header>
                  <Card.Title>Card with Header and Footer</Card.Title>
                  <Card.Description>A complete card example</Card.Description>
                </Card.Header>
                <p style={{ margin: 0, color: tokens.colors.gray[700] }}>
                  This card demonstrates all the available subcomponents including header, body, and footer sections.
                </p>
                <Card.Footer>
                  <Button variant="outline">Cancel</Button>
                  <Button variant="primary">Save</Button>
                </Card.Footer>
              </Card>
            </div>

            <div style={sectionStyles}>
              <h2 style={sectionTitleStyles}>KPI Cards</h2>
              <div style={gridStyles}>
                <KPICard
                  title="Total Orders"
                  value="1,234"
                  subtitle="Last 30 days"
                  trend="+12%"
                  trendDirection="up"
                />
                <KPICard
                  title="Revenue"
                  value="€45,678"
                  subtitle="Last 30 days"
                  trend="+8%"
                  trendDirection="up"
                />
                <KPICard
                  title="Average Order Value"
                  value="€37.02"
                  subtitle="Last 30 days"
                  trend="-3%"
                  trendDirection="down"
                />
              </div>
            </div>
          </>
        )}

        {/* FEEDBACK TAB */}
        {activeTab === 'feedback' && (
          <>
            <div style={sectionStyles}>
              <h2 style={sectionTitleStyles}>Modal</h2>
              <Button onClick={() => setShowModal(true)}>Open Modal</Button>
              <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                size="md"
              >
                <Modal.Header>
                  <Modal.Title>Modal Title</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <p style={{ margin: 0 }}>
                    This is a modal dialog. It can contain any content you need.
                    Press ESC or click outside to close.
                  </p>
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="outline" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={() => setShowModal(false)}>
                    Confirm
                  </Button>
                </Modal.Footer>
              </Modal>
            </div>

            <div style={sectionStyles}>
              <h2 style={sectionTitleStyles}>Toast Notifications</h2>
              <div style={{ display: 'flex', gap: tokens.spacing.md, flexWrap: 'wrap' }}>
                <Button onClick={() => { setToastType('success'); setShowToast(true); }}>
                  Success Toast
                </Button>
                <Button onClick={() => { setToastType('error'); setShowToast(true); }}>
                  Error Toast
                </Button>
                <Button onClick={() => { setToastType('warning'); setShowToast(true); }}>
                  Warning Toast
                </Button>
                <Button onClick={() => { setToastType('info'); setShowToast(true); }}>
                  Info Toast
                </Button>
              </div>
              {showToast && (
                <Toast
                  message={`This is a ${toastType} notification`}
                  type={toastType}
                  onClose={() => setShowToast(false)}
                />
              )}
            </div>

            <div style={sectionStyles}>
              <h2 style={sectionTitleStyles}>Spinner</h2>
              <div style={{ display: 'flex', gap: tokens.spacing.xl, alignItems: 'center' }}>
                <Spinner size="sm" />
                <Spinner size="md" text="Caricamento..." />
                <Spinner size="lg" />
              </div>
            </div>

            <div style={sectionStyles}>
              <h2 style={sectionTitleStyles}>Empty State</h2>
              <Card>
                <EmptyState
                  title="No data found"
                  description="There are no items to display at this time. Try adjusting your filters or create a new item."
                  action={() => alert('Create new item')}
                  actionText="Create Item"
                  centered={false}
                />
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default DesignSystemDemo
