$vars = @(
    @{ Name = "DATABASE_URL"; Value = "postgresql://neondb_owner:npg_sJdvWuYiw1S9@ep-lingering-pine-achczics-pooler.sa-east-1.aws.neon.tech/neondb?channel_binding=require&connect_timeout=15&sslmode=require"; Env = "production" },
    @{ Name = "DATABASE_URL"; Value = "postgresql://neondb_owner:npg_sJdvWuYiw1S9@ep-lingering-pine-achczics-pooler.sa-east-1.aws.neon.tech/neondb?channel_binding=require&connect_timeout=15&sslmode=require"; Env = "preview" },
    @{ Name = "DIRECT_URL"; Value = "postgresql://neondb_owner:npg_sJdvWuYiw1S9@ep-lingering-pine-achczics.sa-east-1.aws.neon.tech/neondb?sslmode=require"; Env = "production" },
    @{ Name = "DIRECT_URL"; Value = "postgresql://neondb_owner:npg_sJdvWuYiw1S9@ep-lingering-pine-achczics.sa-east-1.aws.neon.tech/neondb?sslmode=require"; Env = "preview" },
    @{ Name = "NEXTAUTH_SECRET"; Value = "R7gK9vQ2mX8pL4nT1wY5sJ3cH6dF0zB7uE2aN4iM9qK"; Env = "production" },
    @{ Name = "NEXTAUTH_SECRET"; Value = "R7gK9vQ2mX8pL4nT1wY5sJ3cH6dF0zB7uE2aN4iM9qK"; Env = "preview" },
    @{ Name = "NEXTAUTH_URL"; Value = "https://sistema-documentos.vercel.app"; Env = "production" },
    @{ Name = "NEXTAUTH_URL"; Value = "https://sistema-documentos.vercel.app"; Env = "preview" },
    @{ Name = "CLIENT_LINK_SECRET"; Value = "UciY/shJ19FZjly6Hle+liSA6mpBOiYdMTaGnD0Mndc="; Env = "production" },
    @{ Name = "CLIENT_LINK_SECRET"; Value = "UciY/shJ19FZjly6Hle+liSA6mpBOiYdMTaGnD0Mndc="; Env = "preview" },
    @{ Name = "CLIENT_LINK_TTL_DAYS"; Value = "7"; Env = "production" },
    @{ Name = "CLIENT_LINK_TTL_DAYS"; Value = "7"; Env = "preview" },
    @{ Name = "BLOB_READ_WRITE_TOKEN"; Value = "vercel_blob_rw_92xMDxxOh5LfR9ef_83hnMUrBUKb3AoGi1p7utcVywMVg0V"; Env = "production" },
    @{ Name = "BLOB_READ_WRITE_TOKEN"; Value = "vercel_blob_rw_92xMDxxOh5LfR9ef_83hnMUrBUKb3AoGi1p7utcVywMVg0V"; Env = "preview" },
    @{ Name = "MAX_FILE_SIZE_MB"; Value = "20"; Env = "production" },
    @{ Name = "MAX_FILE_SIZE_MB"; Value = "20"; Env = "preview" }
)

foreach ($var in $vars) {
    Write-Host "Adding $($var.Name) for $($var.Env)..."
    $var.Value | npx vercel env add $var.Name $var.Env --yes 2>&1
}
