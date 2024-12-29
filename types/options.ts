type unit = "ms" | "s" | "min"

interface QueryOptions {
    "shallow"?: boolean
    "print"?: "pretty" | "silent"
    "timeout"?: `${number}${unit}`
    "writeSizeLimit"?: "tiny" | "small" | "medium" | "large" | "unlimited"
}

export { QueryOptions }