import React from 'react'
import {Pressable, PressableProps, View, ViewStyle} from 'react-native'

import {useTheme, atoms as a, web} from '#/alf'
import {Text} from '#/components/Typography'
import {useInteractionState} from '#/components/hooks/useInteractionState'
import {StyleProp} from 'react-native'

type ItemState = {
  name: string
  selected: boolean
  disabled: boolean
  hasError: boolean
  hovered: boolean
  pressed: boolean
  focused: boolean
}

const ItemContext = React.createContext<ItemState>({
  name: '',
  selected: false,
  disabled: false,
  hasError: false,
  hovered: false,
  pressed: false,
  focused: false,
})

const GroupContext = React.createContext<{
  values: string[]
  disabled: boolean
  type: 'radio' | 'checkbox'
  setFieldValue: (props: {name: string; value: boolean}) => void
}>({
  type: 'checkbox',
  values: [],
  disabled: false,
  setFieldValue: () => {},
})

export type GroupProps = React.PropsWithChildren<{
  type?: 'radio' | 'checkbox'
  values: string[]
  maxSelections?: number
  disabled?: boolean
  onChange: (value: string[]) => void
  label: string
  style?: StyleProp<ViewStyle>
}>

export type ItemProps = Omit<
  PressableProps,
  'children' | 'style' | 'onPress' | 'role'
> & {
  type?: 'radio' | 'checkbox'
  name: string
  label: string
  value?: boolean
  onChange?: ({name, value}: {name: string; value: boolean}) => void
  hasError?: boolean
  style?: (state: ItemState) => ViewStyle
  children: ((props: ItemState) => React.ReactNode) | React.ReactNode
}

function Group({
  children,
  values: initialValues,
  onChange,
  disabled = false,
  type = 'checkbox',
  maxSelections,
  style,
  label,
}: GroupProps) {
  if (!initialValues) {
    throw new Error(`Don't forget to pass in 'values' to your Toggle.Group`)
  }

  const groupRole = type === 'radio' ? 'radiogroup' : undefined
  const [values, setValues] = React.useState<string[]>(
    type === 'radio' ? initialValues.slice(0, 1) : initialValues,
  )
  const [maxReached, setMaxReached] = React.useState(false)

  const setFieldValue = React.useCallback<
    Exclude<ItemProps['onChange'], undefined>
  >(
    ({name, value}) => {
      if (type === 'checkbox') {
        setValues(s => {
          const state = s.filter(v => v !== name)
          return value ? state.concat(name) : state
        })
      } else {
        setValues([name])
      }
    },
    [type, setValues],
  )

  React.useEffect(() => {
    onChange(values)
  }, [values, onChange])

  React.useEffect(() => {
    if (type === 'checkbox') {
      if (
        maxSelections &&
        values.length >= maxSelections &&
        maxReached === false
      ) {
        setMaxReached(true)
      } else if (
        maxSelections &&
        values.length < maxSelections &&
        maxReached === true
      ) {
        setMaxReached(false)
      }
    }
  }, [type, values.length, maxSelections, maxReached, setMaxReached])

  const context = React.useMemo(
    () => ({
      values,
      type,
      disabled,
      setFieldValue,
    }),
    [values, disabled, type, setFieldValue],
  )

  return (
    <GroupContext.Provider value={context}>
      <View
        role={groupRole}
        style={style} // TODO
        {...(groupRole === 'radiogroup'
          ? {
              'aria-label': label,
              accessibilityLabel: label,
              accessibilityRole: groupRole,
            }
          : {})}>
        {React.Children.map(children, child => {
          if (!React.isValidElement(child)) return null

          const isSelected = values.includes(child.props.name)
          let isDisabled = disabled || child.props.disabled

          if (maxReached && !isSelected) {
            isDisabled = true
          }

          return React.isValidElement(child) ? (
            <React.Fragment key={child.props.name}>
              {React.cloneElement(child, {
                // @ts-ignore TODO figure out children types
                disabled: isDisabled,
                type: type === 'radio' ? 'radio' : 'checkbox',
                value: isSelected,
                onChange: setFieldValue,
              })}
            </React.Fragment>
          ) : null
        })}
      </View>
    </GroupContext.Provider>
  )
}

function Item({
  children,
  name,
  value = false,
  disabled: itemDisabled = false,
  onChange,
  hasError,
  style,
  type = 'checkbox',
  label,
  ...rest
}: ItemProps) {
  // context can be empty if used outside a Group
  const {
    values: selectedValues,
    type: groupType,
    disabled: groupDisabled,
    setFieldValue,
  } = React.useContext(GroupContext)
  const {
    state: hovered,
    onIn: onHoverIn,
    onOut: onHoverOut,
  } = useInteractionState()
  const {
    state: pressed,
    onIn: onPressIn,
    onOut: onPressOut,
  } = useInteractionState()
  const {state: focused, onIn: onFocus, onOut: onBlur} = useInteractionState()

  const role = groupType === 'radio' ? 'radio' : type
  const selected = selectedValues.includes(name) || !!value
  const disabled = groupDisabled || itemDisabled

  const onPress = React.useCallback(() => {
    const next = !value
    setFieldValue({name, value: next})
    onChange?.({name, value: next}) // TODO don't use confusing method
  }, [name, value, onChange, setFieldValue])

  const state = React.useMemo(
    () => ({
      name,
      selected,
      disabled: disabled ?? false,
      hasError: hasError ?? false,
      hovered,
      pressed,
      focused,
    }),
    [name, selected, disabled, hovered, pressed, focused, hasError],
  )

  return (
    <ItemContext.Provider value={state}>
      <Pressable
        {...rest}
        disabled={disabled}
        aria-disabled={disabled ?? false}
        aria-checked={selected}
        aria-invalid={hasError}
        aria-label={label}
        role={role}
        accessibilityRole={role}
        accessibilityState={{
          disabled: disabled ?? false,
          selected: selected,
        }}
        accessibilityLabel={label}
        accessibilityHint={undefined}
        onPress={onPress}
        onHoverIn={onHoverIn}
        onHoverOut={onHoverOut}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onFocus={onFocus}
        onBlur={onBlur}
        style={[
          a.flex_row,
          a.align_center,
          a.gap_sm,
          focused ? web({outline: 'none'}) : {},
          style?.(state),
        ]}>
        {typeof children === 'function' ? children(state) : children}
      </Pressable>
    </ItemContext.Provider>
  )
}

function Label({children}: React.PropsWithChildren<{}>) {
  const t = useTheme()
  const {disabled} = React.useContext(ItemContext)
  return (
    <Text
      style={[
        a.font_bold,
        {
          userSelect: 'none',
          color: disabled ? t.palette.contrast_400 : t.palette.contrast_600,
        },
      ]}>
      {children}
    </Text>
  )
}

function createSharedToggleStyles({
  theme: t,
  hovered,
  focused,
  selected,
  disabled,
  hasError,
}: {
  theme: ReturnType<typeof useTheme>
  selected: boolean
  hovered: boolean
  focused: boolean
  disabled: boolean
  hasError: boolean
}) {
  const base: ViewStyle[] = []
  const baseHover: ViewStyle[] = []
  const indicator: ViewStyle[] = []

  if (selected) {
    base.push({
      backgroundColor:
        t.name === 'light' ? t.palette.primary_25 : t.palette.primary_900,
      borderColor: t.palette.primary_500,
    })

    if (hovered || focused) {
      baseHover.push({
        backgroundColor:
          t.name === 'light' ? t.palette.primary_100 : t.palette.primary_800,
        borderColor:
          t.name === 'light' ? t.palette.primary_600 : t.palette.primary_400,
      })
    }
  } else {
    if (hovered || focused) {
      baseHover.push({
        backgroundColor: t.palette.contrast_50,
        borderColor: t.palette.contrast_500,
      })
    }
  }

  if (hasError) {
    base.push({
      backgroundColor:
        t.name === 'light' ? t.palette.negative_25 : t.palette.negative_900,
      borderColor:
        t.name === 'light' ? t.palette.negative_300 : t.palette.negative_800,
    })

    if (hovered || focused) {
      baseHover.push({
        backgroundColor:
          t.name === 'light' ? t.palette.negative_25 : t.palette.negative_900,
        borderColor: t.palette.negative_500,
      })
    }
  }

  if (disabled) {
    base.push({
      backgroundColor: t.palette.contrast_200,
      borderColor: t.palette.contrast_300,
    })
  }

  return {
    baseStyles: base,
    baseHoverStyles: baseHover,
    indicatorStyles: indicator,
  }
}

function Checkbox() {
  const t = useTheme()
  const {selected, hovered, focused, disabled, hasError} =
    React.useContext(ItemContext)
  const {baseStyles, baseHoverStyles, indicatorStyles} =
    createSharedToggleStyles({
      theme: t,
      hovered,
      focused,
      selected,
      disabled,
      hasError,
    })
  return (
    <View
      style={[
        a.justify_center,
        a.align_center,
        a.border,
        a.rounded_xs,
        t.atoms.border_contrast,
        {
          height: 20,
          width: 20,
          backgroundColor: selected ? t.palette.primary_500 : undefined,
          borderColor: selected ? t.palette.primary_500 : undefined,
        },
        baseStyles,
        hovered || focused ? baseHoverStyles : {},
      ]}>
      {selected ? (
        <View
          style={[
            a.absolute,
            a.rounded_2xs,
            {height: 12, width: 12},
            selected
              ? {
                  backgroundColor: t.palette.primary_500,
                }
              : {},
            indicatorStyles,
          ]}
        />
      ) : null}
    </View>
  )
}

function Switch() {
  const t = useTheme()
  const {selected, hovered, focused, disabled, hasError} =
    React.useContext(ItemContext)
  const {baseStyles, baseHoverStyles, indicatorStyles} =
    createSharedToggleStyles({
      theme: t,
      hovered,
      focused,
      selected,
      disabled,
      hasError,
    })
  return (
    <View
      style={[
        a.relative,
        a.border,
        a.rounded_full,
        t.atoms.bg,
        t.atoms.border_contrast,
        {
          height: 20,
          width: 30,
        },
        baseStyles,
        hovered || focused ? baseHoverStyles : {},
      ]}>
      <View
        style={[
          a.absolute,
          a.rounded_full,
          {
            height: 12,
            width: 12,
            top: 3,
            left: 3,
            backgroundColor: t.palette.contrast_400,
          },
          selected
            ? {
                backgroundColor: t.palette.primary_500,
                left: 13,
              }
            : {},
          indicatorStyles,
        ]}
      />
    </View>
  )
}

function Radio() {
  const t = useTheme()
  const {selected, hovered, focused, disabled, hasError} =
    React.useContext(ItemContext)
  const {baseStyles, baseHoverStyles, indicatorStyles} =
    createSharedToggleStyles({
      theme: t,
      hovered,
      focused,
      selected,
      disabled,
      hasError,
    })
  return (
    <View
      style={[
        a.justify_center,
        a.align_center,
        a.border,
        a.rounded_full,
        t.atoms.border_contrast,
        {
          height: 20,
          width: 20,
          backgroundColor: selected ? t.palette.primary_500 : undefined,
          borderColor: selected ? t.palette.primary_500 : undefined,
        },
        baseStyles,
        hovered || focused ? baseHoverStyles : {},
      ]}>
      {selected ? (
        <View
          style={[
            a.absolute,
            a.rounded_full,
            {height: 12, width: 12},
            selected
              ? {
                  backgroundColor: t.palette.primary_500,
                }
              : {},
            indicatorStyles,
          ]}
        />
      ) : null}
    </View>
  )
}

export default {
  Item,
  Checkbox,
  Label,
  Switch,
  Radio,
  Group,
}